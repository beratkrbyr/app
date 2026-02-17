#!/usr/bin/env python3

import asyncio
import aiohttp
import json
from datetime import datetime, date
from typing import Dict, Any

# Use the internal backend URL since external has Cloudflare issues
BASE_URL = "http://localhost:8001/api"

class BackendTester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = ""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
    
    async def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None):
        """Make HTTP request to API"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers) as response:
                    text = await response.text()
                    try:
                        json_data = await response.json()
                        return response.status, json_data
                    except:
                        return response.status, {"error": text}
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    text = await response.text()
                    try:
                        json_data = await response.json()
                        return response.status, json_data
                    except:
                        return response.status, {"error": text}
            elif method.upper() == "PUT":
                async with self.session.put(url, json=data, headers=headers) as response:
                    text = await response.text()
                    try:
                        json_data = await response.json()
                        return response.status, json_data
                    except:
                        return response.status, {"error": text}
        except Exception as e:
            return 500, {"error": str(e)}
    
    async def test_services_api(self):
        """Test GET /api/services - Should return 3 services"""
        print("\n=== Testing Services API ===")
        status, data = await self.make_request("GET", "/services")
        
        if status == 200:
            services = data
            if len(services) == 3:
                # Check for expected services
                expected_services = {
                    "Koltuk Yıkama": 500,
                    "Halı Yıkama": 300, 
                    "Ev Temizliği": 800
                }
                
                found_services = {service['name']: service['price'] for service in services}
                all_found = all(name in found_services and found_services[name] == price 
                              for name, price in expected_services.items())
                
                if all_found:
                    self.log_result("GET /api/services", True, 
                                  f"Found all 3 expected services: {list(found_services.keys())}")
                else:
                    self.log_result("GET /api/services", False, 
                                  f"Expected services not found. Got: {found_services}")
            else:
                self.log_result("GET /api/services", False, 
                              f"Expected 3 services, got {len(services)}")
        else:
            self.log_result("GET /api/services", False, f"Status {status}: {data}")
    
    async def test_availability_api(self):
        """Test availability APIs"""
        print("\n=== Testing Availability API ===")
        
        # Test monthly availability
        status, data = await self.make_request("GET", "/availability?year=2026&month=2")
        
        if status == 200:
            dates = data.get('dates', [])
            if len(dates) > 0:
                self.log_result("GET /api/availability", True, 
                              f"Found {len(dates)} availability records for Feb 2026")
                
                # Test time slots for specific date (2026-02-20 - Thursday, 2026-02-21 - Friday)
                await self.test_time_slots("2026-02-20")
                await self.test_time_slots("2026-02-21")  # Friday for discount test
            else:
                self.log_result("GET /api/availability", False, "No availability data found")
        else:
            self.log_result("GET /api/availability", False, f"Status {status}: {data}")
    
    async def test_time_slots(self, date: str):
        """Test time slots for a specific date"""
        status, data = await self.make_request("GET", f"/availability/slots?date={date}")
        
        if status == 200:
            slots = data.get('slots', [])
            available = data.get('available', False)
            if date == "2026-02-20":
                day_name = "Friday"
            elif date == "2026-02-21":
                day_name = "Saturday"
            else:
                day_name = "Unknown"
            self.log_result(f"GET /api/availability/slots ({day_name})", True, 
                          f"Found {len(slots)} available slots: {slots}")
        else:
            self.log_result(f"GET /api/availability/slots ({date})", False, 
                          f"Status {status}: {data}")
    
    async def test_admin_login(self):
        """Test admin login and get token"""
        print("\n=== Testing Admin Login ===")
        
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        status, data = await self.make_request("POST", "/admin/login", login_data)
        
        if status == 200:
            token = data.get('token')
            username = data.get('username')
            if token and username == 'admin':
                self.admin_token = token
                self.log_result("POST /api/admin/login", True, "Admin login successful, token received")
                return True
            else:
                self.log_result("POST /api/admin/login", False, "Invalid response format")
        else:
            self.log_result("POST /api/admin/login", False, f"Status {status}: {data}")
        
        return False
    
    async def test_bookings_creation(self):
        """Test booking creation with Friday discount"""
        print("\n=== Testing Booking Creation ===")
        
        # First, get a service ID
        status, services_data = await self.make_request("GET", "/services")
        if status != 200 or not services_data:
            self.log_result("Booking Test Setup", False, "Could not get services for booking test")
            return
        
        service_id = services_data[0]['id']  # Use first service
        service_name = services_data[0]['name']
        service_price = services_data[0]['price']
        
        # Test Friday booking (should get 10% discount)
        friday_booking = {
            "service_id": service_id,
            "customer_name": "Zeynep Kaya",
            "customer_phone": "5551111111",
            "customer_address": "İstanbul, Beşiktaş",
            "booking_date": "2026-02-20",  # Friday
            "booking_time": "16:00",  # Available slot
            "payment_method": "cash"
        }
        
        status, data = await self.make_request("POST", "/bookings", friday_booking)
        
        if status == 200:
            discount = data.get('discount_applied', 0)
            total_price = data.get('total_price', 0)
            expected_discount = service_price * 0.1
            expected_total = service_price - expected_discount
            
            if abs(discount - expected_discount) < 0.01 and abs(total_price - expected_total) < 0.01:
                self.log_result("POST /api/bookings (Friday discount)", True, 
                              f"Friday discount applied: {discount}₺, Total: {total_price}₺")
            else:
                self.log_result("POST /api/bookings (Friday discount)", False, 
                              f"Wrong discount calculation. Expected discount: {expected_discount}₺, got: {discount}₺")
        else:
            self.log_result("POST /api/bookings (Friday)", False, f"Status {status}: {data}")
        
        # Test non-Friday booking (no discount)
        thursday_booking = {
            "service_id": service_id,
            "customer_name": "Can Demir",
            "customer_phone": "5552222222",
            "customer_address": "Ankara, Çankaya",
            "booking_date": "2026-02-21",  # Saturday (non-Friday)
            "booking_time": "14:00",  # Available slot
            "payment_method": "online"
        }
        
        status, data = await self.make_request("POST", "/bookings", thursday_booking)
        
        if status == 200:
            discount = data.get('discount_applied', 0)
            total_price = data.get('total_price', 0)
            
            if discount == 0 and abs(total_price - service_price) < 0.01:
                self.log_result("POST /api/bookings (No discount)", True, 
                              f"No discount applied correctly. Total: {total_price}₺")
            else:
                self.log_result("POST /api/bookings (No discount)", False, 
                              f"Unexpected discount on non-Friday: {discount}₺")
        else:
            self.log_result("POST /api/bookings (Thursday)", False, f"Status {status}: {data}")
        
        # Test double booking prevention
        duplicate_booking = friday_booking.copy()
        duplicate_booking["customer_name"] = "Test Duplicate"
        
        status, data = await self.make_request("POST", "/bookings", duplicate_booking)
        
        if status == 400:
            self.log_result("Double booking prevention", True, "Correctly prevented double booking")
        else:
            self.log_result("Double booking prevention", False, f"Should have prevented double booking. Status: {status}")
    
    async def test_bookings_check(self):
        """Test checking bookings by phone"""
        print("\n=== Testing Booking Check ===")
        
        status, data = await self.make_request("GET", "/bookings/check?phone=5551234567")
        
        if status == 200:
            bookings = data
            if len(bookings) > 0:
                self.log_result("GET /api/bookings/check", True, 
                              f"Found {len(bookings)} bookings for phone 5551234567")
            else:
                self.log_result("GET /api/bookings/check", False, "No bookings found for test phone")
        else:
            self.log_result("GET /api/bookings/check", False, f"Status {status}: {data}")
    
    async def test_admin_apis(self):
        """Test admin-only APIs"""
        if not self.admin_token:
            self.log_result("Admin API Tests", False, "No admin token available")
            return
        
        print("\n=== Testing Admin APIs ===")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test admin stats
        status, data = await self.make_request("GET", "/admin/stats", headers=headers)
        
        if status == 200:
            stats = data
            required_fields = ['total_bookings', 'pending_bookings', 'confirmed_bookings', 'completed_bookings']
            if all(field in stats for field in required_fields):
                self.log_result("GET /api/admin/stats", True, 
                              f"Stats: {stats['total_bookings']} total, {stats['pending_bookings']} pending")
            else:
                self.log_result("GET /api/admin/stats", False, f"Missing required fields in stats")
        else:
            self.log_result("GET /api/admin/stats", False, f"Status {status}: {data}")
        
        # Test admin bookings list
        status, data = await self.make_request("GET", "/admin/bookings", headers=headers)
        
        if status == 200:
            bookings = data
            self.log_result("GET /api/admin/bookings", True, f"Retrieved {len(bookings)} bookings")
            
            # Test booking status update if we have bookings
            if len(bookings) > 0:
                booking_id = bookings[0]['id']
                update_data = {"status": "confirmed"}
                
                status, data = await self.make_request("PUT", f"/admin/bookings/{booking_id}", 
                                                     update_data, headers)
                
                if status == 200:
                    self.log_result("PUT /api/admin/bookings/{id}", True, "Booking status updated to confirmed")
                else:
                    self.log_result("PUT /api/admin/bookings/{id}", False, f"Status {status}: {data}")
        else:
            self.log_result("GET /api/admin/bookings", False, f"Status {status}: {data}")
        
        # Test admin settings
        status, data = await self.make_request("GET", "/admin/settings", headers=headers)
        
        if status == 200:
            settings = data
            friday_discount_setting = next((s for s in settings if s.get('key') == 'friday_discount'), None)
            
            if friday_discount_setting and friday_discount_setting.get('value') == '10':
                self.log_result("GET /api/admin/settings", True, "Friday discount setting is 10%")
            else:
                self.log_result("GET /api/admin/settings", False, 
                              f"Friday discount setting not found or incorrect: {settings}")
        else:
            self.log_result("GET /api/admin/settings", False, f"Status {status}: {data}")
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print(f"🧪 Starting Backend API Tests for Cleaning Company Booking System")
        print(f"🌐 Testing against: {BASE_URL}")
        print("=" * 80)
        
        try:
            # Customer APIs
            await self.test_services_api()
            await self.test_availability_api()
            await self.test_bookings_creation()
            await self.test_bookings_check()
            
            # Admin APIs
            login_success = await self.test_admin_login()
            if login_success:
                await self.test_admin_apis()
            
            # Summary
            print("\n" + "=" * 80)
            print("🎯 TEST SUMMARY")
            print("=" * 80)
            
            total_tests = len(self.test_results)
            passed_tests = sum(1 for result in self.test_results if result['success'])
            failed_tests = total_tests - passed_tests
            
            print(f"Total Tests: {total_tests}")
            print(f"Passed: ✅ {passed_tests}")
            print(f"Failed: ❌ {failed_tests}")
            print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
            
            # Show failed tests
            if failed_tests > 0:
                print("\n🚨 FAILED TESTS:")
                for result in self.test_results:
                    if not result['success']:
                        print(f"   ❌ {result['test']}: {result['details']}")
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {e}")

async def main():
    async with BackendTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())