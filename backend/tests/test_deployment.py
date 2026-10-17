"""Deployment regressions: fresh startup, restart persistence, SPA/API routing."""
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import backend.main as main
from backend.models import Base, Hospital

@pytest.fixture
def deployment_app(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'demo.db'}", connect_args={"check_same_thread": False})
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(main, "init_db", lambda: Base.metadata.create_all(engine))
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    def get_db():
        with sessions() as db:
            yield db
    main.app.dependency_overrides[main.get_db] = get_db
    yield main.app, sessions
    main.app.dependency_overrides.clear()
    engine.dispose()

def test_empty_database_seeds_and_restart_preserves_changes(deployment_app):
    app, sessions = deployment_app
    with TestClient(app) as client:
        assert client.get('/api/health').json()['status'] == 'healthy'
        assert len(client.get('/api/hospitals').json()) == 3
        with sessions() as db:
            db.query(Hospital).first().name = 'Persisted demo edit'
            db.commit()
    with TestClient(app) as client:
        assert any(h['name'] == 'Persisted demo edit' for h in client.get('/api/hospitals').json())

def test_spa_and_api_routes_are_distinct(deployment_app):
    app, _ = deployment_app
    with TestClient(app) as client:
        root = client.get('/')
        assert root.status_code == 200
        assert 'text/html' in root.headers['content-type']
        assert client.get('/dashboard').text == root.text
        assert client.get('/api/does-not-exist').status_code == 404
        assert client.get('/%2e%2e/backend/main.py').status_code == 404
        asset = next((Path(main.frontend_dist) / 'assets').glob('*.js'))
        assert client.get('/assets/' + asset.name).status_code == 200

def test_seeding_can_be_disabled(deployment_app, monkeypatch):
    app, _ = deployment_app
    monkeypatch.setenv('SEED_DEMO_DATA', 'false')
    with TestClient(app) as client:
        assert client.get('/api/hospitals').json() == []
