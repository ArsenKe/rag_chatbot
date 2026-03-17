"""Google Drive document loader"""

from google.colab import auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
from typing import List, Dict

class GoogleDriveLoader:
    def __init__(self, credentials_path: str = None):
        """Initialize Google Drive loader"""
        self.service = None
        if credentials_path:
            self._authenticate(credentials_path)
    
    def _authenticate(self, credentials_path: str):
        """Authenticate with Google Drive"""
        try:
            from google.oauth2.service_account import Credentials
            credentials = Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/drive']
            )
            self.service = build('drive', 'v3', credentials=credentials)
        except Exception as e:
            print(f"Error authenticating: {e}")
    
    def list_files(self, folder_id: str = None) -> List[Dict]:
        """List files in Google Drive folder"""
        if not self.service:
            return []
        
        try:
            query = "mimeType='application/pdf' or mimeType='text/plain'"
            if folder_id:
                query += f" and '{folder_id}' in parents"
            
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, mimeType)',
                pageSize=100
            ).execute()
            
            return results.get('files', [])
        except Exception as e:
            print(f"Error listing files: {e}")
            return []
    
    def download_file(self, file_id: str) -> str:
        """Download file from Google Drive"""
        try:
            request = self.service.files().get_media(fileId=file_id)
            file = io.BytesIO()
            downloader = MediaIoBaseDownload(file, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
            return file.getvalue().decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Error downloading file: {e}")
            return ""
    
    def load_documents(self, folder_id: str) -> List[Dict]:
        """Load all documents from Google Drive folder"""
        files = self.list_files(folder_id)
        documents = []
        
        for file in files:
            content = self.download_file(file['id'])
            if content:
                documents.append({
                    'id': file['id'],
                    'content': content,
                    'metadata': {
                        'source': f"Google Drive: {file['name']}",
                        'filename': file['name']
                    }
                })
        
        return documents