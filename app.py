from flask import Flask, render_template, request, redirect, url_for, session, abort, jsonify
#from services import firebase_services, imagekit_services
from firebase_admin import auth
import requests
#from PIL import Image
import os
app = Flask(__name__)
app.secret_key = "super-secret-key"


# ======================
# Helpers
# ======================

# ======================
# Public Pages
# ======================

@app.route("/")
def landing():
    return render_template("home.html")
