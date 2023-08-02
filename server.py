from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/save_profile", methods=["POST"])
def save_profile():
    data = request.get_json()
    # Save the profile data to a file or a database here
    # For simplicity, we'll just print it for now
    print(data)
    return jsonify({"message": "Profile saved successfully!"})

if __name__ == "__main__":
    app.run()
