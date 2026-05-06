# 🤖 SQL Chatbot Assistant

An AI-powered web application that converts natural language questions into SQL queries and executes them on your data in real-time. Built with Flask, Groq AI, and modern web technologies.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

### Core Functionality
- 🗣️ **Natural Language to SQL** — Ask questions in plain English, get SQL results
- 📊 **Multi-format Support** — Upload CSV, Excel (.xlsx/.xls), and JSON files
- 💾 **Real-time Query Execution** — SQLite database with instant results
- 🔐 **User Authentication** — Secure registration and login with bcrypt password hashing
- 👤 **User Isolation** — Each user has their own private database

### Advanced Features
- 📈 **Data Visualization** — Automatic bar chart generation for numeric data using Chart.js
- 📥 **CSV Export** — Download query results as CSV files
- 🕐 **Query History** — Save and reuse past queries with localStorage persistence
- 🗂️ **Multiple Tables** — Load multiple datasets and perform JOIN queries
- 🎨 **Dark Mode** — Eye-friendly theme with persistent preference
- 👁️ **Table Preview** — Click any table to see sample data

## 🖼️ Screenshots

### Login Page
![Login](screenshots/login.png)

### Chat Interface
![Chat Interface](screenshots/chat.png)

### Chart Visualization
![Charts](screenshots/chart.png)

### Dark Mode
![Dark Mode](screenshots/dark-mode.png)

## 🛠️ Tech Stack

**Backend:**
- Python 3.10+
- Flask (Web framework)
- Flask-Login (Session management)
- SQLite (Database)
- Pandas (Data processing)
- Bcrypt (Password hashing)

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js (Data visualization)
- LocalStorage API (Client-side persistence)

**AI Integration:**
- Groq API (LLaMA 3.1-8b-instant model)

## 📦 Installation

### Prerequisites
- Python 3.10 or higher
- Git
- Groq API key ([Get one free at console.groq.com](https://console.groq.com))
### Setup

1. **Clone the repository**
```bash
git clone https://github.com/harshi1212/sql-chatbot.git
cd sql-chatbot
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Groq API key
GROQ_API_KEY=your-actual-api-key-here
```

5. **Run the application**
```bash
python app.py
```

6. **Open in browser**

http://127.0.0.1:5000

## 🚀 Usage

### Getting Started

1. **Register an account** — Create a new account with email and password
2. **Upload your data** — Support for CSV, Excel, and JSON files
3. **Ask questions** — Type queries in plain English
4. **View results** — See data in tables or charts
5. **Download** — Export results as CSV

### Example Questions

With an employee dataset:
- "Show all employees"
- "Who has the highest salary?"
- "Count employees in each department"
- "What is the average salary by department?"
- "Show employees who joined after 2020"

With sales data:
- "Total revenue by product"
- "Top 5 customers by purchase amount"
- "Sales trend by month"

### Multiple Tables

Load multiple files with different table names and query across them:
- "Join employees and departments on dept_id"
- "Show sales by employee name"

## 📁 Project Structure
sql-chatbot/
├── app.py                 # Flask backend with all routes
├── .env                   # Environment variables (not in git)
├── .env.example           # Example env file
├── requirements.txt       # Python dependencies
├── users.db              # User authentication database
├── uploads/              # Uploaded files directory
├── screenshots/          # App screenshots for README
├── static/
│   ├── style.css         # Main app styles
│   ├── auth.css          # Login/register styles
│   └── script.js         # Frontend JavaScript
└── templates/
├── index.html        # Main chat interface
├── login.html        # Login page
└── register.html     # Registration page
## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ Session-based authentication with Flask-Login
- ✅ User data isolation (separate databases per user)
- ✅ SQL injection protection via parameterized queries
- ✅ Password strength validation (uppercase, number, special char)
- ✅ Environment variable protection for API keys

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Future Enhancements

- [ ] Line charts for time-series data
- [ ] PDF export functionality
- [ ] Email query results
- [ ] Team workspaces (shared databases)
- [ ] Advanced chart types (pie, scatter, etc.)
- [ ] Query performance optimization
- [ ] API endpoints for external integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Harshitha Chintapalle**

- LinkedIn: [linkedin.com/in/harshitha-chintapalle-219b9224b](https://linkedin.com/in/harshitha-chintapalle-219b9224b)
- Email: chinthapalliharshitha2308@gmail.com
- GitHub: [@harshi1212](https://github.com/harshi1212)

## 🙏 Acknowledgments

- [Groq](https://groq.com) for providing free AI API access
- [Chart.js](https://www.chartjs.org/) for beautiful visualizations
- [Flask](https://flask.palletsprojects.com/) for the web framework

## 📊 Project Stats

- **Lines of Code:** ~1,500+
- **Development Time:** Built progressively with iterative improvements
- **Technologies Used:** 10+
- **Features Implemented:** 12+

---

⭐ If you found this project helpful, please give it a star!
