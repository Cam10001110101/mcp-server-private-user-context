# Data Flow and Encryption Process

## Personal Information Storage Flow

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Input}
    B -->|Invalid| C[Return Error]
    B -->|Valid| D[Generate IV]
    D --> E[JSON Stringify Data]
    E --> F[AES-256-CBC Encrypt]
    F --> G[Store in SQLite]
    G --> H[Return Success]

    style A fill:#f9f,stroke:#333
    style B fill:#ff9,stroke:#333
    style C fill:#f66,stroke:#333
    style D fill:#9f9,stroke:#333
    style E fill:#9f9,stroke:#333
    style F fill:#9f9,stroke:#333
    style G fill:#99f,stroke:#333
    style H fill:#9f9,stroke:#333
```

## Data Retrieval Process

```mermaid
flowchart TD
    A[Query Request] --> B{Validate Query}
    B -->|Invalid| C[Return Error]
    B -->|Valid| D[Query SQLite]
    D --> E{Records Found?}
    E -->|No| F[Return Empty]
    E -->|Yes| G[Extract IV & Data]
    G --> H[AES-256-CBC Decrypt]
    H --> I[Parse JSON]
    I --> J[Return Data]

    style A fill:#f9f,stroke:#333
    style B fill:#ff9,stroke:#333
    style C fill:#f66,stroke:#333
    style D fill:#99f,stroke:#333
    style E fill:#ff9,stroke:#333
    style F fill:#f66,stroke:#333
    style G fill:#9f9,stroke:#333
    style H fill:#9f9,stroke:#333
    style I fill:#9f9,stroke:#333
    style J fill:#9f9,stroke:#333
```

## System Architecture

```mermaid
graph TB
    subgraph Client Layer
        A[MCP Client]
    end

    subgraph Server Layer
        B[Request Handler]
        C[Type Validation]
        D[Tool Router]
    end

    subgraph Encryption Layer
        E[Encryption Service]
        F[IV Generator]
    end

    subgraph Storage Layer
        G[SQLite Database]
        H[Connection Pool]
    end

    A <--> B
    B --> C
    C --> D
    D <--> E
    E <--> F
    E <--> G
    G <--> H

    style A fill:#f9f,stroke:#333
    style B fill:#ff9,stroke:#333
    style C fill:#ff9,stroke:#333
    style D fill:#ff9,stroke:#333
    style E fill:#9f9,stroke:#333
    style F fill:#9f9,stroke:#333
    style G fill:#99f,stroke:#333
    style H fill:#99f,stroke:#333
```

## Database Schema

```mermaid
erDiagram
    PERSONAL_INFO {
        string id PK
        string type
        string name
        string relationship
        string encrypted_data
        string created_at
        string updated_at
    }

    PERSONAL_INFO ||--o{ INDEXES : has
    INDEXES {
        string idx_personal_info_type
        string idx_personal_info_name
    }
