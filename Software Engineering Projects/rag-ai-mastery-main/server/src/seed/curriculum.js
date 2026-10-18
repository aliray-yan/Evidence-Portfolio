export const levelBlueprints = [
  {
    number: 0,
    title: "LEVEL 0: Absolute AI Basics",
    difficulty: "Beginner",
    description: "The plain-English foundation for learners who have never studied AI before.",
    topics: [
      "What is AI?",
      "What is machine learning?",
      "What is deep learning?",
      "What is NLP?",
      "What is a model?",
      "What is training?",
      "What is inference?",
      "What is a dataset?",
      "What is a prediction?",
      "What is a chatbot?"
    ]
  },
  {
    number: 1,
    title: "LEVEL 1: LLM Basics",
    difficulty: "Beginner",
    description: "The essential language model vocabulary behind ChatGPT-style assistants.",
    topics: [
      "What is an LLM?",
      "What is ChatGPT-style AI?",
      "What is a prompt?",
      "What is a response?",
      "What is a token?",
      "Context window",
      "Temperature",
      "System prompt",
      "User prompt",
      "Assistant response",
      "Model limitations",
      "Hallucination"
    ]
  },
  {
    number: 2,
    title: "LEVEL 2: Why RAG Exists",
    difficulty: "Beginner",
    description: "Why companies combine search and generation instead of trusting a raw LLM alone.",
    topics: [
      "Problem with normal LLMs",
      "Knowledge cutoff",
      "Private data problem",
      "Hallucinations",
      "Need for sources",
      "Search plus generation idea",
      "What RAG means",
      "Retrieval step",
      "Augmentation step",
      "Generation step",
      "Real company use cases"
    ]
  },
  {
    number: 3,
    title: "LEVEL 3: Documents and Text Processing",
    difficulty: "Beginner",
    description: "How raw files become usable text for a retrieval pipeline.",
    topics: [
      "What is a document?",
      "PDF, DOCX, TXT, HTML, CSV",
      "Text extraction",
      "Cleaning text",
      "Metadata",
      "Page numbers",
      "Sections",
      "Tables",
      "Images limitation",
      "OCR concept",
      "Document pipeline"
    ]
  },
  {
    number: 4,
    title: "LEVEL 4: Chunking",
    difficulty: "Beginner",
    description: "How to split text into pieces that a retriever and LLM can actually use.",
    topics: [
      "What is chunking?",
      "Why chunks matter",
      "Chunk size",
      "Chunk overlap",
      "Sentence-based chunking",
      "Paragraph chunking",
      "Recursive chunking",
      "Semantic chunking concept",
      "Bad chunking examples",
      "Good chunking examples",
      "Chunk metadata"
    ]
  },
  {
    number: 5,
    title: "LEVEL 5: Embeddings",
    difficulty: "Intermediate",
    description: "The vector representation that makes semantic search possible.",
    topics: [
      "What is an embedding?",
      "Simple analogy",
      "Vector meaning",
      "Similar meaning close together",
      "Embedding models",
      "Dimensionality",
      "Cosine similarity",
      "Dot product concept",
      "Embedding cost and performance",
      "Local embeddings concept"
    ]
  },
  {
    number: 6,
    title: "LEVEL 6: Vector Databases",
    difficulty: "Intermediate",
    description: "Storage and search systems designed for embedding vectors.",
    topics: [
      "What is a vector database?",
      "Why normal SQL search is not enough",
      "pgvector",
      "ChromaDB",
      "Qdrant",
      "Pinecone concept",
      "Weaviate concept",
      "Indexes",
      "Similarity search",
      "Metadata filtering",
      "Top-K retrieval"
    ]
  },
  {
    number: 7,
    title: "LEVEL 7: Semantic Search",
    difficulty: "Intermediate",
    description: "How meaning-based search differs from keyword lookup and where it fails.",
    topics: [
      "Keyword search vs semantic search",
      "Query embedding",
      "Document embedding",
      "Similarity ranking",
      "Top K",
      "Filters",
      "Hybrid search",
      "BM25 concept",
      "When semantic search fails",
      "Improving search quality"
    ]
  },
  {
    number: 8,
    title: "LEVEL 8: RAG Pipeline",
    difficulty: "Intermediate",
    description: "The complete ingestion-to-answer workflow for a grounded AI assistant.",
    topics: [
      "Ingestion",
      "Parsing",
      "Chunking",
      "Embedding",
      "Storing vectors",
      "User query",
      "Query embedding",
      "Retrieval",
      "Context building",
      "Prompt generation",
      "LLM answer",
      "Source citations",
      "Logging"
    ]
  },
  {
    number: 9,
    title: "LEVEL 9: Prompting for RAG",
    difficulty: "Intermediate",
    description: "Prompt templates that keep answers grounded in retrieved context.",
    topics: [
      "System prompts",
      "Context prompts",
      "Question prompts",
      "Grounded answering",
      "Refusal when context missing",
      "Citation instruction",
      "Answer style",
      "Prompt injection basics",
      "Safe prompt templates"
    ]
  },
  {
    number: 10,
    title: "LEVEL 10: Building a Basic RAG App",
    difficulty: "Intermediate",
    description: "A practical walkthrough of the minimum viable RAG application.",
    topics: [
      "Project structure",
      "Upload document",
      "Extract text",
      "Chunk text",
      "Generate embeddings",
      "Store vectors",
      "Ask question",
      "Retrieve chunks",
      "Generate answer",
      "Show sources"
    ]
  },
  {
    number: 11,
    title: "LEVEL 11: LangChain and LlamaIndex Concepts",
    difficulty: "Intermediate",
    description: "Framework concepts without hiding the underlying RAG pipeline.",
    topics: [
      "What frameworks do",
      "Document loaders",
      "Text splitters",
      "Embeddings",
      "Vector stores",
      "Retrievers",
      "Chains",
      "Agents concept",
      "Indexes",
      "When to use framework vs custom code"
    ]
  },
  {
    number: 12,
    title: "LEVEL 12: RAG Evaluation",
    difficulty: "Advanced",
    description: "How to measure retrieval quality, answer quality, and groundedness.",
    topics: [
      "Why evaluation matters",
      "Retrieval quality",
      "Answer quality",
      "Groundedness",
      "Faithfulness",
      "Relevance",
      "Context precision",
      "Context recall",
      "Golden questions",
      "Human review",
      "RAGAS concept",
      "Evaluation dataset"
    ]
  },
  {
    number: 13,
    title: "LEVEL 13: Improving RAG Quality",
    difficulty: "Advanced",
    description: "Practical tactics for better retrieval and more reliable answers.",
    topics: [
      "Better chunking",
      "Better metadata",
      "Hybrid search",
      "Reranking",
      "Query rewriting",
      "Multi-query retrieval",
      "Parent-child chunks",
      "Context compression",
      "Deduplication",
      "Source ranking",
      "Answer verification"
    ]
  },
  {
    number: 14,
    title: "LEVEL 14: Advanced RAG",
    difficulty: "Advanced",
    description: "Patterns for complex retrieval systems and multi-step assistant behavior.",
    topics: [
      "Multi-document RAG",
      "Multi-vector retrieval",
      "Graph RAG concept",
      "Agentic RAG concept",
      "Tool-using RAG",
      "SQL RAG",
      "Structured data RAG",
      "Multi-modal RAG concept",
      "Streaming answers",
      "Conversation memory",
      "Long-context models"
    ]
  },
  {
    number: 15,
    title: "LEVEL 15: Security and Privacy in RAG",
    difficulty: "Advanced",
    description: "The risks and controls needed for private, permission-aware RAG systems.",
    topics: [
      "Private documents",
      "Data leakage",
      "Prompt injection",
      "Indirect prompt injection",
      "Access control",
      "Tenant isolation",
      "PII handling",
      "Logging risks",
      "API key safety",
      "Secure file upload",
      "Permission-aware retrieval"
    ]
  },
  {
    number: 16,
    title: "LEVEL 16: Production RAG Architecture",
    difficulty: "Advanced",
    description: "Architecture concerns that appear when real users depend on a RAG system.",
    topics: [
      "Backend architecture",
      "Worker queues",
      "Async ingestion",
      "File storage",
      "Database design",
      "Vector index design",
      "Caching",
      "Observability",
      "Rate limits",
      "Error handling",
      "Cost tracking",
      "Scaling",
      "Deployment"
    ]
  },
  {
    number: 17,
    title: "LEVEL 17: Local LLMs and Open-Source RAG",
    difficulty: "Advanced",
    description: "Local-first model options, privacy tradeoffs, and hardware realities.",
    topics: [
      "Ollama",
      "llama.cpp concept",
      "Local embedding models",
      "Sentence Transformers concept",
      "Running models locally",
      "Tradeoffs",
      "Hardware requirements",
      "Privacy benefits",
      "Performance limitations"
    ]
  },
  {
    number: 18,
    title: "LEVEL 18: RAG for Business Use Cases",
    difficulty: "Professional",
    description: "Real application patterns for companies, universities, support teams, and analysts.",
    topics: [
      "Company knowledge base",
      "HR assistant",
      "Legal document Q&A",
      "Medical policy assistant with safety disclaimers",
      "Customer support assistant",
      "Developer documentation assistant",
      "SOC analyst assistant",
      "Research paper assistant",
      "University notes assistant",
      "Personal file assistant"
    ]
  },
  {
    number: 19,
    title: "LEVEL 19: RAG Projects",
    difficulty: "Professional",
    description: "Guided project patterns for portfolio-ready RAG applications.",
    topics: [
      "PDF Q&A assistant",
      "Study notes assistant",
      "Company policy assistant",
      "Documentation chatbot",
      "Resume Q&A bot",
      "Cybersecurity report assistant",
      "Research paper summarizer",
      "Ticket support assistant",
      "Local knowledge base search",
      "Multi-document citation assistant"
    ]
  },
  {
    number: 20,
    title: "LEVEL 20: Expert Topics",
    difficulty: "Expert",
    description: "Enterprise-grade and research-adjacent RAG system topics.",
    topics: [
      "Graph RAG deeper overview",
      "Knowledge graphs",
      "Entity extraction",
      "Rerankers",
      "Fine-tuning vs RAG",
      "Evaluation pipelines",
      "Human feedback loops",
      "RAG observability",
      "Guardrails",
      "Red-teaming RAG systems defensively",
      "Enterprise architecture"
    ]
  }
];

export const guidedProjects = [
  "PDF Q&A assistant",
  "Study notes assistant",
  "Company policy assistant",
  "Documentation chatbot",
  "Resume Q&A bot",
  "Cybersecurity report assistant",
  "Research paper summarizer",
  "Ticket support assistant",
  "Local knowledge base search",
  "Multi-document citation assistant"
];

export const toolReferences = [
  ["pgvector", "Vector database", "https://github.com/pgvector/pgvector", "PostgreSQL extension for vector similarity search.", "Free/open-source"],
  ["ChromaDB", "Vector database", "https://www.trychroma.com/", "Local-first vector database often used for prototypes.", "Free/open-source"],
  ["Qdrant", "Vector database", "https://qdrant.tech/", "Vector database with payload filters and production deployment options.", "Free/open-source"],
  ["Weaviate", "Vector database", "https://weaviate.io/", "Vector database with hybrid search and schema tools.", "Free/open-source tier"],
  ["Pinecone", "Vector database", "https://www.pinecone.io/", "Managed vector database concept used in many production RAG systems.", "Hosted/paid options"],
  ["LangChain", "Framework", "https://www.langchain.com/", "Framework for chains, retrievers, loaders, and agentic applications.", "Free/open-source"],
  ["LlamaIndex", "Framework", "https://www.llamaindex.ai/", "Framework focused on data connectors, indexes, and retrieval workflows.", "Free/open-source"],
  ["Ollama", "Local LLM", "https://ollama.com/", "Runs open-source LLMs locally behind a simple API.", "Free"],
  ["llama.cpp", "Local LLM", "https://github.com/ggerganov/llama.cpp", "Low-level local inference runtime for many model formats.", "Free/open-source"],
  ["Sentence Transformers", "Embeddings", "https://www.sbert.net/", "Popular Python library for local embedding models.", "Free/open-source"],
  ["RAGAS", "Evaluation", "https://docs.ragas.io/", "Evaluation toolkit for RAG answer and retrieval quality.", "Free/open-source"],
  ["BM25", "Search", "https://en.wikipedia.org/wiki/Okapi_BM25", "Classic keyword ranking concept used in hybrid search.", "Concept/free"],
  ["Prisma", "Database ORM", "https://www.prisma.io/", "Type-safe ORM used by this app for PostgreSQL access.", "Free/open-source"],
  ["Express", "Backend", "https://expressjs.com/", "Minimal Node.js web framework for APIs.", "Free/open-source"],
  ["React", "Frontend", "https://react.dev/", "UI library used for the RAG AI Mastery client.", "Free/open-source"],
  ["Vite", "Frontend", "https://vite.dev/", "Fast development and build tool for the frontend.", "Free/open-source"],
  ["PostgreSQL", "Database", "https://www.postgresql.org/", "Relational database used for user, course, and RAG metadata.", "Free/open-source"],
  ["OpenAI-compatible APIs", "LLM API", "https://platform.openai.com/docs/api-reference", "Optional provider interface for real model answers.", "Bring your own key"],
  ["Markdown", "Documents", "https://www.markdownguide.org/", "Simple text format that is easy to ingest and chunk.", "Free"],
  ["Docker Compose", "DevOps", "https://docs.docker.com/compose/", "Local service orchestration for PostgreSQL and pgvector.", "Free/open-source"]
];

export const achievementBlueprints = [
  ["FIRST_LESSON", "First Lesson", "Complete your first RAG AI Mastery lesson.", "Complete one lesson", 10, "book-open"],
  ["TEN_LESSONS", "Ten Lessons", "Complete ten lessons across the path.", "Complete ten lessons", 25, "graduation-cap"],
  ["PATH_BUILDER", "Path Builder", "Complete twenty-five lessons.", "Complete twenty-five lessons", 50, "route"],
  ["QUIZ_TAKER", "Quiz Taker", "Submit your first quiz.", "Submit one quiz", 10, "check-circle"],
  ["QUIZ_MACHINE", "Quiz Machine", "Submit ten quizzes.", "Submit ten quizzes", 35, "brain"],
  ["FIRST_RAG_UPLOAD", "First RAG Upload", "Upload your first local document into the playground.", "Upload one document", 20, "upload"],
  ["DOCUMENT_INGESTOR", "Document Ingestor", "Upload five documents into the playground.", "Upload five documents", 45, "database"],
  ["CURIOUS_BOOKMARKER", "Curious Bookmarker", "Bookmark three useful lessons.", "Create three bookmarks", 15, "bookmark"],
  ["AI_BEGINNER", "AI Beginner", "Study the basics of AI and machine learning.", "Complete Level 0", 20, "sparkles"],
  ["LLM_FOUNDATION", "LLM Foundation", "Understand prompts, tokens, and hallucination.", "Complete Level 1", 20, "message-square"],
  ["RAG_REASONER", "RAG Reasoner", "Explain why RAG exists.", "Complete Level 2", 25, "search"],
  ["CHUNKING_CRAFTER", "Chunking Crafter", "Practice chunk size and overlap decisions.", "Complete Level 4", 25, "scissors"],
  ["VECTOR_EXPLORER", "Vector Explorer", "Understand embeddings and vector search.", "Complete Level 6", 30, "orbit"],
  ["PIPELINE_BUILDER", "Pipeline Builder", "Assemble a full RAG pipeline.", "Complete Level 8", 35, "workflow"],
  ["PROMPT_GUARD", "Prompt Guard", "Use safe grounded prompt templates.", "Complete Level 9", 35, "shield"],
  ["EVALUATOR", "RAG Evaluator", "Evaluate retrieval and answer quality.", "Complete Level 12", 40, "chart"],
  ["SECURITY_MINDED", "Security Minded", "Identify privacy and prompt injection risks.", "Complete Level 15", 45, "lock"],
  ["LOCAL_FIRST", "Local First", "Understand Ollama and local embeddings.", "Complete Level 17", 45, "cpu"],
  ["BUSINESS_ARCHITECT", "Business Architect", "Map RAG to real business use cases.", "Complete Level 18", 50, "briefcase"],
  ["EXPERT_TRACK", "Expert Track", "Reach the expert topics.", "Complete Level 20", 75, "award"]
];
