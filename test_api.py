import requests
import json

base_url = "http://localhost:3001"

def test_login():
    try:
        # Login Logic
        print("Attempting login...")
        login_payload = {"username": "Andy", "password": "bingo2024"}
        response = requests.post(f"{base_url}/api/auth/login", json=login_payload)
        
        if response.status_code != 200:
            print(f"Login failed: {response.status_code}")
            print(response.text)
            return

        data = response.json()
        token = data.get("token")
        print(f"Login successful. Token obtained.")

        # Profile Fetch Logic
        print("Fetching profile...")
        headers = {"Authorization": f"Bearer {token}"}
        profile_response = requests.get(f"{base_url}/api/users/profile", headers=headers)
        
        if profile_response.status_code == 200:
            print("Profile data:")
            print(json.dumps(profile_response.json(), indent=2))
        else:
            print(f"Profile fetch failed: {profile_response.status_code}")
            print(profile_response.text)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
