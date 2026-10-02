import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    print(f"Starting SQL Practice Platform API on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
