# 🛡️ Dependly — Supply Chain Risk Intelligence & Domino Simulator

> **Stop reacting to open-source supply chain disasters after they break production. Simulate the domino effect, visualize blast radiuses, and apply 1-click smart fixes.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python)](https://www.python.org/)
[![CISA KEV](https://img.shields.io/badge/Intelligence-CISA_KEV_Integrated-FF5D5D.svg)](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [The Problem: Supply Chain Jenga Effect](#-the-problem-supply-chain-jenga-effect)
- [Core Features](#-core-features)
  - [1. Domino Impact Simulator](#1-domino-impact-simulator)
  - [2. Multi-Application Architecture Graphs](#2-multi-application-architecture-graphs)
  - [3. Dependency Explorer & Transitive Attenuation](#3-dependency-explorer--transitive-attenuation)
  - [4. Real CISA KEV Exploit Intelligence](#4-real-cisa-kev-exploit-intelligence)
  - [5. Collaborative War Room](#5-collaborative-war-room)
  - [6. Typosquat & Malware Monitor](#6-typosquat--malware-monitor)
  - [7. Dual-Theme Support (Dark & Light Mode)](#7-dual-theme-support-dark--light-mode)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
  - [Option A: One-Click Windows Launcher (Recommended)](#option-a-one-click-windows-launcher-recommended)
  - [Option B: Manual Setup (Linux / macOS / Windows)](#option-b-manual-setup-linux--macos--windows)
- [REST API Reference](#-rest-api-reference)
- [Contributing & License](#-contributing--license)

---

## 💡 Executive Overview

Modern software applications are built like **towers of Jenga blocks**. Over **80% of code** in modern enterprise applications consists of third-party open-source packages. While developers explicitly import direct dependencies (e.g., `express`, `requests`), those packages silently pull in hundreds of **transitive dependencies** (e.g., `semver`, `qs`, `urllib3`, `lodash`).

Traditional vulnerability scanners overwhelm engineering teams with raw security acronyms (*Betweenness Centrality, Reverse PageRank, RRI, Transitive Attenuation*) and endless lists of CVEs without explaining:
1. **Which microservices will actually crash?**
2. **What is the live financial & operational downtime risk?**
3. **What is the single minimum fix that protects the maximum number of services?**

**Dependly** solves this by converting raw graph theory into an intuitive, consumer-grade **Domino Simulator** and real-time **Supply Chain Risk Intelligence** platform.

---

## ⚠️ The Problem: Supply Chain Jenga Effect

```
[ Your Production Fintech App ] 💥 CRASHED ($45,000 / hr downtime)
              ▲
              │ (Direct Import)
   [ jsonwebtoken v9.0.0 ]
              ▲
              │ (Transitive Propagation)
     [ semver v7.5.0 ]  🔥 PATIENT ZERO (CVE-2023-38325 ReDoS Flaw)
```

A tiny vulnerability in a 4th-degree transitive package can ripple upward through session middleware, authentication gateways, and API microservices until production revenue crashes. Dependly pinpoints **Patient Zero**, tracks the **Ripple Wave**, quantifies the **Downtime Cost**, and delivers a **1-Click Smart Fix**.

---

## 🔥 Core Features

### 1. Domino Impact Simulator
- **Patient Zero Identification**: Automatically isolates the root vulnerable package deep in your dependency tree.
- **Ripple Wave Propagation**: Visually animates the red domino wave spreading upward into intermediate nodes and production services.
- **Live Downtime Cost Counter**: Calculates estimated hourly business financial risk (e.g., `$45,000/hr`).
- **1-Click Smart Fix Engine**: Identifies the single package override or version pin (e.g., pin `semver` to `v7.5.4`) that neutralizes the entire domino wave across all services, saving thousands of developer refactoring hours.
- **1-Minute Guided Simulation Tour**: Interactive step-by-step walkthrough for first-time visitors to grasp supply chain risk instantly.

### 2. Multi-Application Architecture Graphs
- **Distinct Application Topologies**: Supports custom graph renderings for diverse services like *CloudAuth Identity Gateway*, *Fintech Payment Engine*, *HealthConnect EHR Portal*, and *Logistics Fleet Tracker*.
- **Real-Time Node Rendering**: Node sizing, color coding, and connection lines adapt dynamically to risk scores and criticality tags (`PCI_DSS_GATEWAY`, `HIPAA_PATIENT_DB`, `CI_CD_TRIGGER`).

### 3. Dependency Explorer & Transitive Attenuation
- **Tree & Depth Inspection**: View exact depth levels (1st degree direct up to Nth degree transitive).
- **Transitive Risk Attenuation**: Applies mathematical decay algorithms so distant, non-executable transitive warnings don't clutter your high-priority alerts.
- **Safer Alternatives Recommendation**: Suggests drop-in secure package alternatives with health & maintenance metrics.

### 4. Real CISA KEV Exploit Intelligence
- **1,710+ Active Exploits**: Direct backend integration with CISA's Known Exploited Vulnerabilities catalog.
- **Threat Briefing Modals**: Instant access to CVE attack vectors, ransomware association tags, required action deadlines, and vendor remediation notes.

### 5. Collaborative War Room
- **Active Incident Response**: Centralized dashboard for DevOps & AppSec teams to declare security war rooms.
- **Blast Radius Containment**: Step-by-step containment checklists, patch verification, and real-time team mitigation status.

### 6. Typosquat & Malware Monitor
- **Proactive Package Spoofing Protection**: Detects typosquatting attacks (e.g., `reque5ts`, `lodash-native`, `cross-env-malware`) before malicious code reaches production build pipelines.

### 7. Dual-Theme Support (Dark & Light Mode)
- **Instant Toggle**: One-click header button (Sun / Moon icon) toggles between dark mode and light mode.
- **Comprehensive Coverage**: Uses wildcard CSS attribute rules to ensure 100% card, table, modal, and graph component theme compatibility without contrast bugs.

---

## 🏗️ System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │   Overview   │  │ Domino Simulator │  │ Dependency Tree Explorer  │  │
│  └──────┬───────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
└─────────┼───────────────────┼──────────────────────────┼────────────────┘
          │                   │                          │
          ▼                   ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI API)                         │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │    Graph Engine      │  │ Risk Simulator   │  │  CISA KEV Service │  │
│  │  (NetworkX / Math)   │  │ (Smart Fix Algo) │  │  (Real-Time Sync) │  │
│  └──────────────────────┘  └──────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```text
Dependly/
├── .gitignore               # Comprehensive Git ignore rules (Node, Python, Venv, IDE)
├── start.bat                # 1-Click Windows batch launcher
├── README.md                # Project documentation
├── backend/                 # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py          # FastAPI application entrypoint & CORS config
│   │   ├── models/          # Pydantic schemas & graph models
│   │   ├── services/        # Graph engine, simulator, ingestor, CISA KEV fetcher
│   │   └── api/             # REST endpoints (applications, simulate, cve, warroom)
│   ├── data/                # Pre-loaded graph datasets & CISA KEV offline cache
│   ├── tests/               # Pytest suite & pipeline verification
│   └── requirements.txt     # Python dependencies
└── frontend/                # React 18 + Vite + TailwindCSS Frontend
    ├── public/              # Static assets & icons
    ├── src/
    │   ├── components/      # React components (Domino Simulator, Explorer, War Room)
    │   ├── services/        # Axios API client & backend integrations
    │   ├── App.tsx          # Main application container & tab router
    │   ├── index.css        # Global CSS design system & Light/Dark mode themes
    │   └── main.tsx         # React DOM root entrypoint
    ├── package.json         # Node dependencies
    ├── tailwind.config.js    # Tailwind styling tokens & custom colors
    └── vite.config.ts       # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Python**: `3.10` or higher
- **Node.js**: `18.0.0` or higher (with `npm` or `pnpm`)

---

### Option A: One-Click Windows Launcher (Recommended)

Simply double-click **`start.bat`** in the project root directory.

The script will automatically:
1. Create a Python virtual environment in `backend\venv` if missing and install dependencies.
2. Run `npm install` in `frontend\` if `node_modules` is missing.
3. Launch the FastAPI backend on `http://localhost:8000`.
4. Launch the Vite frontend on `http://localhost:5173`.
5. Automatically open your default browser to `http://localhost:5173`.

---

### Option B: Manual Setup (Linux / macOS / Windows)

#### 1. Start the FastAPI Backend
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python -m uvicorn app.main:app --port 8000 --reload
```
*Backend API docs available at: `http://localhost:8000/docs`*

#### 2. Start the Vite Frontend
```bash
# In a new terminal window
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```
*Frontend UI accessible at: `http://localhost:5173`*

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/overview` | `GET` | Returns global system risk summary, total dependencies, and active incidents. |
| `GET /api/applications` | `GET` | Lists all monitored project applications and their risk scores. |
| `GET /api/applications/{app_id}/graph` | `GET` | Returns full NetworkX node and edge graph data for a target application. |
| `POST /api/simulate/{app_id}` | `POST` | Triggers domino ripple simulation and calculates 1-click smart fix recommendations. |
| `GET /api/cve/kev` | `GET` | Fetches live CISA Known Exploited Vulnerabilities catalog entries. |
| `GET /api/warroom/incidents` | `GET` | Retrieves active War Room incident response sessions and containment status. |
| `GET /api/typosquat/threats` | `GET` | Returns active typosquatting and malicious package alerts. |

---


---

<p align="center">
  <b>Dependly — Protecting Modern Software Supply Chains One Domino at a Time.</b>
</p>
