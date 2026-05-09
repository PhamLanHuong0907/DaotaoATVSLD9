import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.db.mongodb import init_db, get_all_document_models, close_db
from app.models.user import User
from app.models.enums import UserRole
from app.models.system_settings import SystemSettings
from app.models.catalog import Occupation, CertificateType

async def cleanup():
    print("--- Starting Data Cleanup ---")
    await init_db()
    models = get_all_document_models()
    
    # Models we want to PRESERVE (keep)
    preserve_models = [SystemSettings, Occupation, CertificateType]
    
    for model in models:
        model_name = model.__name__
        
        if model in preserve_models:
            print(f"Skipping {model_name} (Preserved)")
            continue
            
        if model == User:
            # Delete all users EXCEPT admins
            count = await User.find({"role": {"$ne": UserRole.ADMIN}}).count()
            await User.find({"role": {"$ne": UserRole.ADMIN}}).delete()
            print(f"Deleted {count} non-admin users from User")
        else:
            # Delete everything else
            count = await model.find_all().count()
            await model.find_all().delete()
            print(f"Deleted {count} records from {model_name}")
            
    await close_db()
    print("--- Cleanup Finished Successfully ---")

if __name__ == "__main__":
    asyncio.run(cleanup())
