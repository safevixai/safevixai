```markdown
# `local_emergency_catalog.py`

## Overview

This module is responsible for loading and parsing local emergency data from CSV files. It provides a centralized catalog of emergency services, including hospitals and other facilities, with location, contact information, and service details. This catalog is used to provide relevant information to users in emergency situations.

## Architecture

This module is part of the backend services and is used by the chatbot service to provide information about local emergency services. It reads data from CSV files located in the `chatbot_service/data` directory. The data is then used to populate the emergency catalog, which can be queried by other modules.

## Key Classes/Functions

