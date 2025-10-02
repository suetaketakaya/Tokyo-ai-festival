from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return '<h1>Hello World</h1><p>シンプルなFlaskアプリケーションです</p><a href="/about">会社情報</a>'

@app.route('/about')
def about():
    return '<h1>会社情報</h1><p>このサイトは株式会社テストによって開発されました。</p><a href="/">ホーム</a>'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
