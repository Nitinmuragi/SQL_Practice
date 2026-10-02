"""
Administrator Account & Credential Management Utility
SQL Practice Platform
"""
import sys
import argparse
from app import create_app
from app.extensions import db
from app.models.user import User

def list_users():
    users = User.query.order_by(User.id.asc()).all()
    print("\n" + "=" * 65)
    print(f"{'ID':<5} {'Role':<12} {'Email':<30} {'Full Name'}")
    print("-" * 65)
    for u in users:
        role = "ADMIN" if u.is_admin else "Student"
        print(f"{u.id:<5} {role:<12} {u.email:<30} {u.full_name}")
    print("=" * 65 + "\n")

def set_password(email, new_password):
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user:
        print(f"[-] Error: User with email '{email}' not found.")
        return False
    user.set_password(new_password)
    db.session.commit()
    print(f"[+] SUCCESS: Password successfully updated for '{user.email}' (Role: {'ADMIN' if user.is_admin else 'Student'}).")
    return True

def set_email(old_email, new_email):
    old_email = old_email.strip().lower()
    new_email = new_email.strip().lower()
    user = User.query.filter_by(email=old_email).first()
    if not user:
        print(f"[-] Error: User with email '{old_email}' not found.")
        return False
    conflict = User.query.filter_by(email=new_email).first()
    if conflict and conflict.id != user.id:
        print(f"[-] Error: Another account already uses email '{new_email}'.")
        return False
    user.email = new_email
    db.session.commit()
    print(f"[+] SUCCESS: Email changed from '{old_email}' to '{new_email}'.")
    return True

def set_admin_role(email, is_admin: bool):
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user:
        print(f"[-] Error: User with email '{email}' not found.")
        return False
    user.is_admin = is_admin
    db.session.commit()
    status = "PROMOTED to Administrator" if is_admin else "DEMOTED to Student"
    print(f"[+] SUCCESS: User '{user.email}' {status}.")
    return True

def interactive_menu():
    while True:
        print("\n" + "=" * 45)
        print("  SQL Practice Platform - Admin Manager")
        print("=" * 45)
        print("1. List All Users & Roles")
        print("2. Change Admin Password")
        print("3. Change Admin Email")
        print("4. Promote User to Admin")
        print("5. Demote User from Admin")
        print("6. Exit")
        print("-" * 45)
        choice = input("Enter choice (1-6): ").strip()

        if choice == '1':
            list_users()
        elif choice == '2':
            email = input("Enter admin email (default: admin@example.com): ").strip() or "admin@example.com"
            new_pw = input("Enter new password: ").strip()
            if not new_pw:
                print("[-] Password cannot be blank.")
                continue
            set_password(email, new_pw)
        elif choice == '3':
            old_email = input("Enter current email (default: admin@example.com): ").strip() or "admin@example.com"
            new_email = input("Enter new email: ").strip()
            if not new_email:
                print("[-] New email cannot be blank.")
                continue
            set_email(old_email, new_email)
        elif choice == '4':
            email = input("Enter user email to promote to Admin: ").strip()
            if email:
                set_admin_role(email, True)
        elif choice == '5':
            email = input("Enter user email to demote from Admin: ").strip()
            if email:
                set_admin_role(email, False)
        elif choice == '6':
            print("Exiting...")
            break
        else:
            print("[-] Invalid choice, try again.")

def main():
    parser = argparse.ArgumentParser(description="Manage Admin credentials and roles")
    parser.add_argument("--list", action="store_true", help="List all users and roles")
    parser.add_argument("--email", type=str, help="Target user email")
    parser.add_argument("--password", type=str, help="New password to set")
    parser.add_argument("--new-email", type=str, help="New email to assign")
    parser.add_argument("--make-admin", action="store_true", help="Promote target email to Admin")
    parser.add_argument("--remove-admin", action="store_true", help="Demote target email from Admin")

    args = parser.parse_args()
    app = create_app()

    with app.app_context():
        if len(sys.argv) == 1:
            interactive_menu()
            return

        if args.list:
            list_users()

        if args.email and args.password:
            set_password(args.email, args.password)

        if args.email and args.new_email:
            set_email(args.email, args.new_email)

        if args.email and args.make_admin:
            set_admin_role(args.email, True)

        if args.email and args.remove_admin:
            set_admin_role(args.email, False)

if __name__ == "__main__":
    main()
