"""
Test Work Photos and Location Tracking APIs
New features: Before/After photos upload, Team location tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://titan-admin-panel.preview.emergentagent.com')

# Test booking ID - confirmed booking for testing
TEST_BOOKING_ID = "69959dca306ca23083ef1711"


class TestWorkPhotosAPI:
    """Test work photos upload and retrieval APIs"""
    
    def test_upload_before_photo(self):
        """Test uploading before work photo"""
        response = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": TEST_BOOKING_ID,
                "photo_type": "before",
                "photo_base64": "dGVzdF9waG90b19iZWZvcmU="
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Fotoğraf yüklendi"
    
    def test_upload_after_photo(self):
        """Test uploading after work photo"""
        response = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": TEST_BOOKING_ID,
                "photo_type": "after",
                "photo_base64": "dGVzdF9waG90b19hZnRlcg=="
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Fotoğraf yüklendi"
    
    def test_upload_photo_invalid_type(self):
        """Test uploading photo with invalid type"""
        response = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": TEST_BOOKING_ID,
                "photo_type": "invalid",
                "photo_base64": "dGVzdA=="
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "before" in data["detail"] or "after" in data["detail"]
    
    def test_upload_photo_invalid_booking(self):
        """Test uploading photo for non-existent booking"""
        response = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": "invalid_booking_id",
                "photo_type": "before",
                "photo_base64": "dGVzdA=="
            }
        )
        assert response.status_code == 400
    
    def test_get_work_photos(self):
        """Test getting work photos for a booking"""
        response = requests.get(f"{BASE_URL}/api/work-photos/{TEST_BOOKING_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the photos we uploaded
        if len(data) > 0:
            assert "id" in data[0]
            assert "photo_type" in data[0]
            assert "photo_base64" in data[0]
            assert "created_at" in data[0]
    
    def test_get_photos_empty_booking(self):
        """Test getting photos for booking with no photos"""
        # Use a different booking that likely has no photos
        response = requests.get(f"{BASE_URL}/api/work-photos/nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestLocationTrackingAPI:
    """Test location tracking APIs for team location updates"""
    
    def test_update_location_on_the_way(self):
        """Test updating location to on_the_way status"""
        response = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": TEST_BOOKING_ID,
                "latitude": 41.0082,
                "longitude": 28.9784,
                "status": "on_the_way"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Konum güncellendi"
    
    def test_update_location_arrived(self):
        """Test updating location to arrived status"""
        response = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": TEST_BOOKING_ID,
                "latitude": 41.0150,
                "longitude": 28.9890,
                "status": "arrived"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Konum güncellendi"
    
    def test_update_location_in_progress(self):
        """Test updating location to in_progress status"""
        response = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": TEST_BOOKING_ID,
                "latitude": 41.0150,
                "longitude": 28.9890,
                "status": "in_progress"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Konum güncellendi"
    
    def test_update_location_completed(self):
        """Test updating location to completed status"""
        response = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": TEST_BOOKING_ID,
                "latitude": 41.0150,
                "longitude": 28.9890,
                "status": "completed"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Konum güncellendi"
    
    def test_get_location(self):
        """Test getting location for a booking"""
        response = requests.get(f"{BASE_URL}/api/location/{TEST_BOOKING_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "latitude" in data
        assert "longitude" in data
        # Should have updated_at if location was set
        if data["status"] != "not_started":
            assert "updated_at" in data
    
    def test_get_location_not_started(self):
        """Test getting location for booking without location updates"""
        response = requests.get(f"{BASE_URL}/api/location/nonexistent_booking")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_started"
        assert data["latitude"] is None
        assert data["longitude"] is None
    
    def test_update_location_invalid_booking(self):
        """Test updating location for invalid booking"""
        response = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": "invalid_booking_id",
                "latitude": 41.0082,
                "longitude": 28.9784,
                "status": "on_the_way"
            }
        )
        assert response.status_code == 400


class TestAdminBookingsWithNewFeatures:
    """Test admin bookings endpoint includes booking IDs for detail page"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_admin_bookings_have_id(self, admin_token):
        """Test that admin bookings include ID for detail navigation"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            booking = data[0]
            # Verify booking has ID for detail page navigation
            assert "id" in booking
            assert "service_name" in booking
            assert "customer_name" in booking
            assert "status" in booking


class TestIntegrationWorkflow:
    """Test full workflow: Admin views booking, uploads photos, updates location"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_full_workflow(self, admin_token):
        """Test complete workflow for photo and location tracking"""
        # Step 1: Get bookings
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert bookings_response.status_code == 200
        bookings = bookings_response.json()
        assert len(bookings) > 0
        
        booking_id = bookings[0]["id"]
        
        # Step 2: Upload before photo
        before_photo = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": booking_id,
                "photo_type": "before",
                "photo_base64": "d29ya2Zsb3dfdGVzdF9iZWZvcmU="
            }
        )
        assert before_photo.status_code == 200
        
        # Step 3: Update location to on_the_way
        location_update = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": booking_id,
                "latitude": 41.0082,
                "longitude": 28.9784,
                "status": "on_the_way"
            }
        )
        assert location_update.status_code == 200
        
        # Step 4: Verify location status
        location_check = requests.get(f"{BASE_URL}/api/location/{booking_id}")
        assert location_check.status_code == 200
        location_data = location_check.json()
        assert location_data["status"] == "on_the_way"
        
        # Step 5: Upload after photo
        after_photo = requests.post(
            f"{BASE_URL}/api/work-photos",
            json={
                "booking_id": booking_id,
                "photo_type": "after",
                "photo_base64": "d29ya2Zsb3dfdGVzdF9hZnRlcg=="
            }
        )
        assert after_photo.status_code == 200
        
        # Step 6: Update location to completed
        complete_location = requests.post(
            f"{BASE_URL}/api/location/update",
            json={
                "booking_id": booking_id,
                "latitude": 41.0150,
                "longitude": 28.9890,
                "status": "completed"
            }
        )
        assert complete_location.status_code == 200
        
        # Step 7: Verify all photos are saved
        photos_check = requests.get(f"{BASE_URL}/api/work-photos/{booking_id}")
        assert photos_check.status_code == 200
        photos = photos_check.json()
        assert len(photos) >= 2  # At least the ones we just uploaded
        
        print(f"Full workflow test passed for booking {booking_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
