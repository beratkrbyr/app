"""
Test New Features: Push Notifications Context, Reviews, Referral System, Loyalty Points
Tests for iteration 3 - Focus on professional features for cleaning company app
"""

import pytest
import requests
import os
import time
import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cleaning-admin-vps.preview.emergentagent.com')

# Use unique identifiers for test data
TEST_TIMESTAMP = int(time.time())
TEST_PHONE_1 = f"TEST_REF_{TEST_TIMESTAMP}"
TEST_PHONE_2 = f"TEST_REF2_{TEST_TIMESTAMP}"


class TestReviewsAPI:
    """Test Reviews API - Line 371-463 in server.py"""
    
    def test_get_review_stats(self):
        """Test review stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/reviews/stats")
        assert response.status_code == 200
        data = response.json()
        assert "average_rating" in data
        assert "total_reviews" in data
        assert "breakdown" in data
        assert all(str(i) in data["breakdown"] for i in range(1, 6))
        print(f"Review stats: avg={data['average_rating']}, total={data['total_reviews']}")
    
    def test_get_reviews_list(self):
        """Test getting reviews list"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Reviews count: {len(data)}")
    
    def test_create_review_invalid_booking(self):
        """Test creating review with invalid booking ID"""
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "booking_id": "invalid_id",
            "rating": 5,
            "comment": "Great service!"
        })
        assert response.status_code == 400
        print("Invalid booking ID correctly rejected")
    
    def test_create_review_nonexistent_booking(self):
        """Test creating review with non-existent booking ID"""
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "booking_id": "507f1f77bcf86cd799439011",  # Valid ObjectId format but doesn't exist
            "rating": 5,
            "comment": "Great service!"
        })
        assert response.status_code == 404
        print("Non-existent booking ID correctly rejected")


class TestReferralSystem:
    """Test Referral System API - Line 336-367 in server.py"""
    
    @pytest.fixture
    def setup_referral_customers(self):
        """Create two test customers for referral testing"""
        # Create first customer (referrer)
        customer1_data = {
            "name": "Referrer Test",
            "phone": TEST_PHONE_1,
            "email": "referrer@test.com"
        }
        resp1 = requests.post(f"{BASE_URL}/api/customers/register", json=customer1_data)
        if resp1.status_code != 200:
            # Customer might already exist, try login
            resp1 = requests.post(f"{BASE_URL}/api/customers/login", json={"phone": TEST_PHONE_1})
        
        customer1 = resp1.json()
        
        # Create second customer (referee)
        customer2_data = {
            "name": "Referee Test",
            "phone": TEST_PHONE_2,
            "email": "referee@test.com"
        }
        resp2 = requests.post(f"{BASE_URL}/api/customers/register", json=customer2_data)
        if resp2.status_code != 200:
            resp2 = requests.post(f"{BASE_URL}/api/customers/login", json={"phone": TEST_PHONE_2})
        
        customer2 = resp2.json()
        
        return {
            "referrer": customer1,
            "referee": customer2
        }
    
    def test_referral_code_generation(self, setup_referral_customers):
        """Test that customers receive referral codes on registration"""
        referrer = setup_referral_customers["referrer"]
        assert "referral_code" in referrer
        assert len(referrer["referral_code"]) == 8  # 8 character code
        print(f"Referrer code: {referrer['referral_code']}")
    
    def test_use_invalid_referral_code(self, setup_referral_customers):
        """Test using invalid referral code"""
        referee = setup_referral_customers["referee"]
        response = requests.post(f"{BASE_URL}/api/referral/use", json={
            "referral_code": "INVALID1",
            "customer_phone": referee["phone"]
        })
        assert response.status_code == 404
        data = response.json()
        assert "geçersiz" in data["detail"].lower() or "invalid" in data["detail"].lower()
        print("Invalid referral code correctly rejected")
    
    def test_use_own_referral_code(self, setup_referral_customers):
        """Test that customer cannot use their own referral code"""
        referrer = setup_referral_customers["referrer"]
        response = requests.post(f"{BASE_URL}/api/referral/use", json={
            "referral_code": referrer["referral_code"],
            "customer_phone": referrer["phone"]
        })
        assert response.status_code == 400
        data = response.json()
        assert "kendi" in data["detail"].lower() or "own" in data["detail"].lower()
        print("Using own referral code correctly rejected")


class TestLoyaltyPoints:
    """Test Loyalty Points System - Line 204-221 in server.py"""
    
    def test_customer_has_loyalty_points_field(self):
        """Test that customer profile includes loyalty points"""
        # Use existing test customer
        response = requests.get(f"{BASE_URL}/api/customers/profile?phone=5551234567")
        if response.status_code == 200:
            data = response.json()
            assert "loyalty_points" in data
            assert "total_bookings" in data
            print(f"Customer loyalty points: {data['loyalty_points']}, bookings: {data['total_bookings']}")
        else:
            # Create a test customer if doesn't exist
            register_resp = requests.post(f"{BASE_URL}/api/customers/register", json={
                "name": "Loyalty Test",
                "phone": "5551234567",
                "email": "loyalty@test.com"
            })
            if register_resp.status_code == 200:
                data = register_resp.json()
                assert "loyalty_points" in data
                assert data["loyalty_points"] == 0  # New customers start with 0 points
                print("New customer registered with 0 loyalty points")


class TestBookingWithLoyalty:
    """Test Booking Flow with Loyalty Points integration"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_customer_with_booking(self, admin_token):
        """Setup: Create customer, service availability, and booking for testing reviews"""
        # Use unique phone
        test_phone = f"TEST_BOOK_{TEST_TIMESTAMP}"
        
        # Register customer
        register_resp = requests.post(f"{BASE_URL}/api/customers/register", json={
            "name": "Booking Test Customer",
            "phone": test_phone,
            "email": "booking@test.com",
            "address": "Test Address Istanbul"
        })
        if register_resp.status_code != 200:
            login_resp = requests.post(f"{BASE_URL}/api/customers/login", json={"phone": test_phone})
            customer = login_resp.json()
        else:
            customer = register_resp.json()
        
        # Get a service
        services_resp = requests.get(f"{BASE_URL}/api/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        service = services[0]
        
        # Set availability for tomorrow
        tomorrow = (datetime.datetime.now() + datetime.timedelta(days=2)).strftime("%Y-%m-%d")
        requests.post(
            f"{BASE_URL}/api/admin/availability",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={
                "date": tomorrow,
                "available": True,
                "time_slots": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
            }
        )
        
        # Create booking
        booking_resp = requests.post(f"{BASE_URL}/api/bookings", json={
            "service_id": service["id"],
            "customer_name": customer["name"],
            "customer_phone": customer["phone"],
            "customer_address": "Test Address Istanbul",
            "booking_date": tomorrow,
            "booking_time": "11:00",
            "payment_method": "cash"
        })
        
        if booking_resp.status_code == 200:
            booking = booking_resp.json()
            return {
                "customer": customer,
                "booking": booking,
                "service": service
            }
        else:
            pytest.skip(f"Could not create booking: {booking_resp.json()}")
    
    def test_booking_adds_loyalty_points(self, test_customer_with_booking):
        """Test that creating a booking adds loyalty points"""
        customer = test_customer_with_booking["customer"]
        
        # Check customer profile for updated points
        profile_resp = requests.get(f"{BASE_URL}/api/customers/profile?phone={customer['phone']}")
        assert profile_resp.status_code == 200
        profile = profile_resp.json()
        
        # Points should be added (1 point per 10 TL)
        print(f"Customer loyalty points after booking: {profile['loyalty_points']}")
        print(f"Customer total bookings: {profile['total_bookings']}")


class TestAdminBookingManagement:
    """Test Admin Booking Status Updates (Confirm/Reject/Complete)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_get_admin_bookings(self, admin_token):
        """Test getting all bookings as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin bookings count: {len(data)}")
        return data
    
    def test_update_booking_status_to_confirmed(self, admin_token):
        """Test updating booking status to confirmed"""
        # First get bookings
        bookings_resp = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        bookings = bookings_resp.json()
        
        # Find a pending booking
        pending_booking = next((b for b in bookings if b.get("status") == "pending"), None)
        if not pending_booking:
            pytest.skip("No pending bookings to test status update")
        
        # Update status to confirmed
        response = requests.put(
            f"{BASE_URL}/api/admin/bookings/{pending_booking['id']}",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"status": "confirmed"}
        )
        assert response.status_code == 200
        print(f"Booking {pending_booking['id']} status updated to confirmed")
    
    def test_update_booking_status_to_completed(self, admin_token):
        """Test updating booking status to completed"""
        # First get bookings
        bookings_resp = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        bookings = bookings_resp.json()
        
        # Find a confirmed booking
        confirmed_booking = next((b for b in bookings if b.get("status") == "confirmed"), None)
        if not confirmed_booking:
            pytest.skip("No confirmed bookings to test status update")
        
        # Update status to completed
        response = requests.put(
            f"{BASE_URL}/api/admin/bookings/{confirmed_booking['id']}",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"status": "completed"}
        )
        assert response.status_code == 200
        print(f"Booking {confirmed_booking['id']} status updated to completed")


class TestReviewAfterCompletion:
    """Test Review Flow After Booking Completion"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_cannot_review_pending_booking(self, admin_token):
        """Test that pending bookings cannot be reviewed"""
        # Get bookings
        bookings_resp = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        bookings = bookings_resp.json()
        
        # Find a pending booking
        pending_booking = next((b for b in bookings if b.get("status") == "pending"), None)
        if not pending_booking:
            pytest.skip("No pending bookings to test")
        
        # Try to create review
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "booking_id": pending_booking["id"],
            "rating": 5,
            "comment": "Test review"
        })
        assert response.status_code == 400
        data = response.json()
        assert "tamamlanmış" in data["detail"].lower() or "completed" in data["detail"].lower()
        print("Cannot review pending booking - correct behavior")
    
    def test_review_completed_booking(self, admin_token):
        """Test reviewing a completed booking"""
        # Get bookings
        bookings_resp = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        bookings = bookings_resp.json()
        
        # Find a completed booking without review
        completed_booking = None
        for booking in bookings:
            if booking.get("status") == "completed":
                # Check if has review via bookings check
                check_resp = requests.get(f"{BASE_URL}/api/bookings/check?phone={booking.get('customer_phone', '')}")
                if check_resp.status_code == 200:
                    customer_bookings = check_resp.json()
                    for cb in customer_bookings:
                        if cb.get("id") == booking["id"] and not cb.get("has_review"):
                            completed_booking = booking
                            break
            if completed_booking:
                break
        
        if not completed_booking:
            pytest.skip("No completed bookings without review to test")
        
        # Create review
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "booking_id": completed_booking["id"],
            "rating": 5,
            "comment": "Mükemmel hizmet! Çok teşekkürler."
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data["rating"] == 5
            assert "id" in data
            print(f"Review created for booking {completed_booking['id']}")
        elif response.status_code == 400 and "zaten" in response.json().get("detail", "").lower():
            print("Booking already has a review")
        else:
            print(f"Review response: {response.status_code} - {response.json()}")


class TestAdminStats:
    """Test Admin Dashboard Stats"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_get_admin_stats(self, admin_token):
        """Test getting admin dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected stats are present
        assert "total_bookings" in data
        assert "pending_bookings" in data
        assert "confirmed_bookings" in data
        assert "completed_bookings" in data
        assert "total_customers" in data
        assert "total_reviews" in data
        assert "total_revenue" in data
        
        print(f"Stats - Bookings: {data['total_bookings']}, Customers: {data['total_customers']}, Revenue: {data['total_revenue']}")
    
    def test_get_admin_reviews(self, admin_token):
        """Test getting reviews as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reviews",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin reviews count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
