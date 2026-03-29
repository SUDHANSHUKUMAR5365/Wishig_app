import requests
import sys
import json
import io
from datetime import datetime

class CelebrationAPITester:
    def __init__(self, base_url="https://qr-moments-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_event_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_get_themes(self):
        """Test themes endpoint"""
        success, response = self.run_test("Get Themes", "GET", "themes", 200)
        if success:
            # Verify we have 12 themes
            if len(response) == 12:
                print(f"   ✅ Found all 12 themes")
                # Check categories
                categories = set()
                for theme_id, theme_data in response.items():
                    categories.add(theme_data.get('category'))
                expected_categories = {'boys', 'girls', 'anniversary'}
                if categories == expected_categories:
                    print(f"   ✅ All theme categories present: {categories}")
                else:
                    print(f"   ⚠️ Missing categories. Found: {categories}, Expected: {expected_categories}")
            else:
                print(f"   ⚠️ Expected 12 themes, found {len(response)}")
        return success

    def test_create_event(self):
        """Test event creation"""
        event_data = {
            "person_name": "Test User",
            "occasion_type": "birthday",
            "event_date": "2024-12-25T00:00:00Z",
            "theme": "royal_gold",
            "photos": [],
            "special_note": "This is a test celebration!",
            "easter_egg_message": "Secret test message!"
        }
        
        success, response = self.run_test("Create Event", "POST", "events", 200, data=event_data)
        if success and 'id' in response:
            self.created_event_id = response['id']
            print(f"   ✅ Event created with ID: {self.created_event_id}")
        return success

    def test_get_events(self):
        """Test getting all events"""
        success, response = self.run_test("Get All Events", "GET", "events", 200)
        if success:
            print(f"   ✅ Found {len(response)} events")
        return success

    def test_get_single_event(self):
        """Test getting a single event"""
        if not self.created_event_id:
            print("❌ No event ID available for single event test")
            return False
        
        success, response = self.run_test(
            "Get Single Event", 
            "GET", 
            f"events/{self.created_event_id}", 
            200
        )
        if success:
            if response.get('person_name') == 'Test User':
                print(f"   ✅ Event data matches")
            else:
                print(f"   ⚠️ Event data mismatch")
        return success

    def test_update_event(self):
        """Test updating an event"""
        if not self.created_event_id:
            print("❌ No event ID available for update test")
            return False
        
        update_data = {
            "special_note": "Updated test message!"
        }
        
        success, response = self.run_test(
            "Update Event", 
            "PUT", 
            f"events/{self.created_event_id}", 
            200,
            data=update_data
        )
        if success:
            if response.get('special_note') == 'Updated test message!':
                print(f"   ✅ Event updated successfully")
            else:
                print(f"   ⚠️ Update may not have worked")
        return success

    def test_file_upload(self):
        """Test file upload functionality"""
        # Create a simple test file
        test_content = b"This is a test file for upload"
        test_file = io.BytesIO(test_content)
        test_file.name = "test.txt"
        
        files = {'file': ('test.txt', test_file, 'text/plain')}
        
        success, response = self.run_test(
            "File Upload", 
            "POST", 
            "upload?folder=test", 
            200,
            files=files
        )
        if success:
            if 'url' in response and 'path' in response:
                print(f"   ✅ File uploaded successfully")
                print(f"   File URL: {response.get('url')}")
                return True, response.get('path')
            else:
                print(f"   ⚠️ Upload response missing expected fields")
        return False, None

    def test_file_download(self, file_path):
        """Test file download functionality"""
        if not file_path:
            print("❌ No file path available for download test")
            return False
        
        # The file_path is the storage path, we need to access it via /files/ endpoint
        success, _ = self.run_test(
            "File Download", 
            "GET", 
            f"files/{file_path}", 
            200
        )
        return success

    def test_delete_event(self):
        """Test deleting an event"""
        if not self.created_event_id:
            print("❌ No event ID available for delete test")
            return False
        
        success, response = self.run_test(
            "Delete Event", 
            "DELETE", 
            f"events/{self.created_event_id}", 
            200
        )
        if success:
            print(f"   ✅ Event deleted successfully")
        return success

    def test_get_nonexistent_event(self):
        """Test getting a non-existent event (should return 404)"""
        success, response = self.run_test(
            "Get Non-existent Event", 
            "GET", 
            "events/nonexistent-id", 
            404
        )
        return success

def main():
    print("🚀 Starting Celebration QR Experience API Tests")
    print("=" * 60)
    
    tester = CelebrationAPITester()
    
    # Test sequence
    tests = [
        ("Root API", tester.test_root_endpoint),
        ("Themes", tester.test_get_themes),
        ("Create Event", tester.test_create_event),
        ("Get All Events", tester.test_get_events),
        ("Get Single Event", tester.test_get_single_event),
        ("Update Event", tester.test_update_event),
        ("File Upload", lambda: tester.test_file_upload()[0]),
        ("Delete Event", tester.test_delete_event),
        ("Non-existent Event", tester.test_get_nonexistent_event),
    ]
    
    # Run file upload and download test
    print(f"\n🔍 Testing File Upload & Download...")
    upload_success, file_path = tester.test_file_upload()
    if upload_success and file_path:
        download_success = tester.test_file_download(file_path)
        if download_success:
            tester.tests_passed += 1
        tester.tests_run += 1
    
    # Run other tests
    for test_name, test_func in tests:
        if test_name != "File Upload":  # Already tested above
            test_func()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())