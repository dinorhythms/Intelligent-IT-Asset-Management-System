CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    last_login TIMESTAMP,
    login_status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE asset_class (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    qr_code VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE asset_details (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    asset_identifier VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    no_of_installation INT,
    manufacturer VARCHAR(100),
    software_type VARCHAR(50),
    software_category VARCHAR(50),
    asset_location VARCHAR(100),
    asset_type VARCHAR(50),
    software_licences VARCHAR(100),
    asset_status VARCHAR(50),
    warranty_expiry_date TIMESTAMP,
    vendor_name VARCHAR(100),
    configuration_type VARCHAR(50),
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    predictive_score FLOAT,
    dashboard_view BOOLEAN DEFAULT TRUE
);

CREATE TABLE asset_info (
    id SERIAL PRIMARY KEY,
    asset_identifier VARCHAR(100) NOT NULL,
    asset_id VARCHAR(50) NOT NULL REFERENCES asset_details(asset_id),
    asset_type VARCHAR(50),
    dashboard_view BOOLEAN DEFAULT TRUE
);

CREATE TABLE asset_request (
    id SERIAL PRIMARY KEY,
    request_no VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    asset_identifier VARCHAR(100) NOT NULL,
    qty INT NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vendor_name VARCHAR(100),
    approval_status VARCHAR(50) DEFAULT 'pending',
    request_status VARCHAR(50) DEFAULT 'open',
    request_priority VARCHAR(20) DEFAULT 'normal'
);

CREATE TABLE service_info (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) UNIQUE NOT NULL,
    service_desc VARCHAR(255) NOT NULL,
    service_portfolio VARCHAR(100),
    service_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    service_status VARCHAR(50),
    asset_id VARCHAR(50) REFERENCES asset_details(asset_id),
    service_manager VARCHAR(100),
    predictive_impact FLOAT,
    dashboard_view BOOLEAN DEFAULT TRUE
);

CREATE TABLE service_map (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) REFERENCES service_info(service_id),
    asset_id VARCHAR(50) REFERENCES asset_details(asset_id),
    service_status VARCHAR(50),
    date_map TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qr_code_reference VARCHAR(100)
);
