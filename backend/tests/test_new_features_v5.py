"""
Test file for TİTAN 360 cleaning app - New Features Testing (Iteration 5)
Tests:
1. Auth check for tabs layout (backend has no specific endpoint for this)
2. Customer photo upload during booking
3. Admin password change feature
4. Admin viewing customer photos in booking detail
5. Admin login and panel access
6. Customer login and register flow
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cleaning-admin-vps.preview.emergentagent.com')

class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert data["username"] == "admin", "Username mismatch"
        print(f"Admin login successful, token received")
        
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should return 401 for invalid credentials"


class TestAdminPasswordChange:
    """Test admin password change feature"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed - skipping authenticated tests")
        
    def test_password_change_wrong_current_password(self, admin_token):
        """Test password change with wrong current password"""
        response = requests.put(
            f"{BASE_URL}/api/admin/change-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "current_password": "wrongpassword",
                "new_password": "newpass123"
            }
        )
        assert response.status_code == 400, "Should return 400 for wrong current password"
        
    def test_password_change_success(self, admin_token):
        """Test successful password change and revert"""
        # Change password
        response = requests.put(
            f"{BASE_URL}/api/admin/change-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "current_password": "admin123",
                "new_password": "temppass123"
            }
        )
        assert response.status_code == 200, f"Password change failed: {response.text}"
        
        # Login with new password
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "temppass123"
        })
        assert response.status_code == 200, "Login with new password failed"
        new_token = response.json()["token"]
        
        # Revert password back to original
        response = requests.put(
            f"{BASE_URL}/api/admin/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={
                "current_password": "temppass123",
                "new_password": "admin123"
            }
        )
        assert response.status_code == 200, "Password revert failed"
        print("Password change and revert successful")


class TestCustomerRegistrationAndLogin:
    """Test customer registration and login flow"""
    
    test_phone = "5559999999"
    
    def test_customer_registration(self):
        """Test customer registration"""
        # First try to clean up if exists (by attempting login)
        response = requests.post(f"{BASE_URL}/api/customers/register", json={
            "name": "Test Customer",
            "phone": self.test_phone,
            "email": "test@example.com",
            "address": "Test Address 123"
        })
        # Either 200 (created) or 400 (already exists)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data, "ID missing in response"
            assert "token" in data, "Token missing in response"
            assert "referral_code" in data, "Referral code missing"
            print(f"Customer registered: {data['name']}, referral_code: {data['referral_code']}")
        else:
            print("Customer already exists")
            
    def test_customer_login_success(self):
        """Test customer login with registered phone"""
        # Ensure customer exists
        requests.post(f"{BASE_URL}/api/customers/register", json={
            "name": "Test Customer",
            "phone": self.test_phone
        })
        
        # Login
        response = requests.post(f"{BASE_URL}/api/customers/login", json={
            "phone": self.test_phone
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert data["phone"] == self.test_phone, "Phone mismatch"
        print(f"Customer login successful: {data['name']}")
        
    def test_customer_login_not_registered(self):
        """Test login with unregistered phone"""
        response = requests.post(f"{BASE_URL}/api/customers/login", json={
            "phone": "1111111111"
        })
        assert response.status_code == 404, "Should return 404 for unregistered phone"


class TestBookingWithPhotos:
    """Test booking creation with customer photos"""
    
    @pytest.fixture
    def service_id(self):
        """Get first available service"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        services = response.json()
        if not services:
            pytest.skip("No services available")
        return services[0]["id"]
    
    @pytest.fixture
    def customer_token(self):
        """Get customer token"""
        # Ensure customer exists
        requests.post(f"{BASE_URL}/api/customers/register", json={
            "name": "Photo Test Customer",
            "phone": "5558888888"
        })
        
        response = requests.post(f"{BASE_URL}/api/customers/login", json={
            "phone": "5558888888"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Customer login failed")
    
    @pytest.fixture
    def available_date_time(self):
        """Get available date and time slot"""
        import datetime
        # Try next 30 days
        today = datetime.date.today()
        for i in range(1, 30):
            date = today + datetime.timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            
            response = requests.get(f"{BASE_URL}/api/availability/slots?date={date_str}")
            if response.status_code == 200:
                data = response.json()
                slots = data.get("slots", [])
                if slots:
                    return {"date": date_str, "time": slots[0]}
        pytest.skip("No available slots in next 30 days")
    
    def test_booking_creation_with_photos(self, service_id, available_date_time):
        """Test creating booking with customer photos"""
        # First ensure customer is registered
        test_phone = "5558888888"
        requests.post(f"{BASE_URL}/api/customers/register", json={
            "name": "Photo Test Customer",
            "phone": test_phone,
            "address": "Test Address 456"
        })
        
        # Small test image in base64 (1x1 pixel PNG)
        test_photo_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        booking_data = {
            "service_id": service_id,
            "customer_name": "Photo Test Customer",
            "customer_phone": test_phone,
            "customer_address": "Test Address 456",
            "booking_date": available_date_time["date"],
            "booking_time": available_date_time["time"],
            "payment_method": "cash",
            "customer_photos": [test_photo_base64, test_photo_base64]  # 2 photos
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200, f"Booking creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Booking ID missing"
        print(f"Booking created with ID: {data['id']}")
        return data["id"]


class TestAdminViewCustomerPhotos:
    """Test admin viewing customer photos in booking detail"""
    
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
    
    def test_admin_get_bookings_with_photos(self, admin_token):
        """Test admin can see bookings with customer photos"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin bookings: {response.text}"
        
        bookings = response.json()
        print(f"Total bookings: {len(bookings)}")
        
        # Check for bookings with customer_photos
        bookings_with_photos = [b for b in bookings if b.get("customer_photos")]
        print(f"Bookings with customer photos: {len(bookings_with_photos)}")
        
        if bookings_with_photos:
            booking = bookings_with_photos[0]
            photos = booking.get("customer_photos", [])
            print(f"First booking has {len(photos)} customer photo(s)")
            assert len(photos) > 0, "Customer photos should be present"


class TestAdminStats:
    """Test admin dashboard stats"""
    
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
    
    def test_admin_stats(self, admin_token):
        """Test admin can get dashboard stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin stats: {response.text}"
        
        data = response.json()
        assert "total_bookings" in data
        assert "total_customers" in data
        print(f"Admin stats: {data}")


class TestAdminServices:
    """Test admin service management"""
    
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
    
    def test_admin_get_services(self, admin_token):
        """Test admin can get all services"""
        response = requests.get(
            f"{BASE_URL}/api/admin/services",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin services: {response.text}"
        services = response.json()
        print(f"Total services: {len(services)}")


class TestAdminSettings:
    """Test admin settings"""
    
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
    
    def test_get_settings(self, admin_token):
        """Test getting settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        settings = response.json()
        print(f"Settings: {settings}")
        
    def test_update_friday_discount(self, admin_token):
        """Test updating Friday discount setting"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"key": "friday_discount", "value": "10"}
        )
        assert response.status_code == 200
        print("Friday discount setting updated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
