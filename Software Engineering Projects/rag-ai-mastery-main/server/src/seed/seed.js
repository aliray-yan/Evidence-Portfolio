import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client.js";
import { achievementBlueprints, guidedProjects, levelBlueprints, toolReferences } from "./curriculum.js";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function chunkTopics(topics, size = 4) {
  const groups = [];
  for (let index = 0; index < topics.length; index += size) {
    groups.push(topics.slice(index, index + size));
  }
  return groups;
}

function paragraphs(...items) {
  return items.filter(Boolean).join("\n\n");
}

const coreLessonProfiles = {
  "What is AI?": {
    plain:
      "Artificial intelligence means software that performs tasks we normally connect with human thinking: understanding language, recognizing patterns, making recommendations, planning steps, or answering questions. AI is not one single thing. It is a family of techniques that let computers use data and rules to make useful decisions.",
    eli10:
      "AI is like a very patient helper that has looked at many examples. If you show it a new problem, it tries to use patterns from those examples to help you.",
    analogy:
      "Think of AI like a junior assistant in a library. It can sort books, answer simple questions, and suggest what to read next, but it still needs clear instructions and trusted information.",
    why:
      "RAG is built on AI, but it also fixes a weakness of AI: guessing without evidence. If you understand AI as pattern-based assistance, it becomes obvious why we add retrieval, citations, and evaluation.",
    technical:
      "Most modern AI systems turn inputs into numerical representations, process those numbers through a model, and return a prediction or generated output. A RAG app uses AI twice: embeddings represent text for search, and a language model turns retrieved evidence into an answer.",
    visual:
      "Draw three boxes: input, model, output. Under the model, add the note: learned patterns plus instructions. Then add a second row for RAG: question, search documents, answer with sources.",
    practice:
      "Name three apps you use that probably contain AI. For each one, write what the input is, what the model likely predicts, and what output the user sees.",
    mistakes: [
      "Thinking AI understands the world exactly like a person.",
      "Assuming AI output is true just because it sounds confident.",
      "Forgetting that useful AI systems still need product design, data quality, and safety checks."
    ]
  },
  "What is machine learning?": {
    plain:
      "Machine learning is a way to build software by learning from examples instead of writing every rule by hand. The system sees many input-output examples, finds patterns, and uses those patterns on new inputs.",
    eli10:
      "If you practice many math problems, you start recognizing how to solve similar ones. Machine learning is the computer version of learning from practice examples.",
    analogy:
      "A spam filter is like a guard who studies old spam messages and normal messages. Over time it learns clues that help it sort new messages.",
    why:
      "Embeddings, rerankers, classifiers, and LLMs all come from machine learning. Knowing this helps you understand why model behavior depends on data, examples, and evaluation.",
    technical:
      "A training process adjusts model parameters to reduce error on training data. During inference, the trained model receives a new input and computes an output. In RAG, you usually do not train the LLM; you retrieve better context so inference is better grounded.",
    visual:
      "Show training as examples flowing into a model, then inference as one new question flowing into the trained model.",
    practice:
      "Choose one prediction task, such as classifying support tickets. List five example inputs and the label each example should teach the model.",
    mistakes: [
      "Confusing training with everyday use of a model.",
      "Expecting a model to know information it never learned or retrieved.",
      "Ignoring the difference between a model's prediction and verified truth."
    ]
  },
  "What is an LLM?": {
    plain:
      "A large language model is a machine learning model trained to work with text. It predicts and generates language based on patterns learned from large collections of text and instruction examples.",
    eli10:
      "An LLM is like autocomplete that became very advanced. It does not just finish one word; it can write explanations, plans, code, summaries, and answers.",
    analogy:
      "Imagine a writer who has read a huge library but cannot open your company's private files unless you hand them over as context.",
    why:
      "RAG exists because LLMs are powerful language engines but not reliable private knowledge stores. We use retrieval to bring the right facts into the model's context window.",
    technical:
      "LLMs tokenize text, convert tokens into internal vectors, use transformer layers to model relationships, and generate tokens one step at a time. They are probabilistic, so prompt design and retrieved context strongly influence the answer.",
    visual:
      "Draw tokens entering a transformer block and a response coming out. Add a side box labeled retrieved context to show what RAG supplies.",
    practice:
      "Ask an LLM one general question and one private-company question. Explain why the second question needs retrieval or supplied context.",
    mistakes: [
      "Assuming an LLM is a database.",
      "Expecting a model to know private or newly changed information without context.",
      "Judging reliability by fluent writing instead of source support."
    ]
  },
  "What is ChatGPT-style AI?": {
    plain:
      "ChatGPT-style AI is a conversational interface wrapped around a language model. The user sends messages, the system keeps conversation context, and the model generates helpful responses one token at a time.",
    eli10:
      "It is like texting a smart helper. The helper can explain things, but it still needs the right facts if the topic is private or new.",
    analogy:
      "A chat assistant is like a customer service agent at a desk. The agent can speak well, but they need access to the correct files before answering account-specific questions.",
    why:
      "Most learners meet AI through chat first. RAG turns chat from a general helper into a document-grounded assistant that can answer with sources.",
    technical:
      "A chat app sends a list of messages to a model: system, user, assistant, and sometimes tool or context messages. RAG adds retrieved chunks before generation so the assistant can answer from external evidence.",
    visual:
      "Draw a chat transcript beside a retrieval panel. Show the user's question causing document search before the assistant replies.",
    practice:
      "Write a chat question that a general model can answer, then rewrite it into a company-specific question that requires RAG.",
    mistakes: [
      "Believing a chat UI alone makes the system knowledgeable.",
      "Not showing sources for document-specific answers.",
      "Letting old conversation context override fresh retrieved evidence."
    ]
  },
  "What is a prompt?": {
    plain:
      "A prompt is the instruction and context you send to a language model. In RAG, the prompt usually includes a system rule, retrieved chunks, the user's question, and citation instructions.",
    eli10:
      "A prompt is how you ask the AI what to do. A better prompt is like giving better directions before asking for help.",
    analogy:
      "If a chef has ingredients and a recipe, the result is better. The prompt is the recipe; retrieved chunks are the ingredients.",
    why:
      "RAG quality depends on prompt discipline. The model should answer from retrieved context, cite sources, and admit when the answer is missing.",
    technical:
      "A RAG prompt should separate instructions from retrieved text, mark sources clearly, and include a refusal rule. This lowers hallucination risk and makes answer behavior easier to test.",
    visual:
      "Show a prompt template with slots: system rules, context chunks, question, answer format, citation rule.",
    practice:
      "Write a prompt rule that says: answer only from context, cite chunk IDs, and say you do not know when context is missing.",
    mistakes: [
      "Putting retrieved text into the prompt without source labels.",
      "Letting the model answer from memory when context is weak.",
      "Mixing user instructions and retrieved document text without boundaries."
    ]
  },
  "What is a token?": {
    plain:
      "A token is a small piece of text used by a language model. A token may be a word, part of a word, punctuation, or whitespace pattern. Models read and write tokens, not whole paragraphs at once.",
    eli10:
      "Tokens are like LEGO pieces for language. The model builds sentences by choosing one piece after another.",
    analogy:
      "A context window is like a suitcase, and tokens are the items you pack. If you pack too much irrelevant context, the useful evidence may not fit.",
    why:
      "Chunk size, context limits, cost, and latency all depend on tokens. RAG engineers must manage tokens carefully so retrieved context is useful and affordable.",
    technical:
      "A tokenizer maps text to token IDs. The model has a maximum context window, so the combined system prompt, retrieved chunks, user question, and answer budget must fit.",
    visual:
      "Break a sentence into token blocks, then place those blocks inside a fixed-size context window.",
    practice:
      "Take one paragraph and estimate tokens by dividing characters by four. Then decide whether it would fit inside a 700-token chunk.",
    mistakes: [
      "Assuming one token always equals one word.",
      "Retrieving too many chunks and crowding out the actual answer.",
      "Forgetting to reserve tokens for the model's final answer."
    ]
  },
  "Context window": {
    plain:
      "A context window is the maximum amount of text a model can consider at one time. It includes system instructions, chat history, retrieved chunks, the user question, and the answer being generated.",
    eli10:
      "The AI has a desk with limited space. If you pile too many papers on it, the important page may get buried.",
    analogy:
      "A suitcase can hold only so much. RAG engineers decide which evidence deserves space in the suitcase.",
    why:
      "Context limits force tradeoffs. Good RAG retrieves focused chunks instead of dumping entire documents into the prompt.",
    technical:
      "The context budget is measured in tokens. Retrieval, reranking, compression, and prompt templates are all ways to fit the most useful evidence inside that budget.",
    visual:
      "Draw a fixed-width box labeled context window and fill it with system prompt, retrieved chunks, question, and answer budget.",
    practice:
      "Given five retrieved chunks, choose the three you would include and explain what you would leave out.",
    mistakes: [
      "Assuming a larger context window removes the need for retrieval.",
      "Filling the prompt with duplicate chunks.",
      "Forgetting to reserve answer tokens."
    ]
  },
  Temperature: {
    plain:
      "Temperature controls how random or creative a language model's token choices are. Lower temperature is more predictable; higher temperature is more varied.",
    eli10:
      "Low temperature is like giving the safest answer. High temperature is like brainstorming more wildly.",
    analogy:
      "A calculator should be consistent, while a story writer can be creative. RAG answers usually need the calculator side.",
    why:
      "RAG assistants should usually be grounded and consistent, so temperature is often low for factual question answering.",
    technical:
      "Temperature changes the sampling distribution over possible next tokens. It does not fix missing context or poor retrieval; it only changes generation behavior.",
    visual:
      "Show a slider from consistent to creative, with RAG factual QA near the consistent side.",
    practice:
      "Explain when you might use temperature 0.2 versus 0.9 in an AI product.",
    mistakes: [
      "Raising temperature to compensate for weak evidence.",
      "Thinking temperature controls truthfulness directly.",
      "Using creative settings for compliance or policy answers."
    ]
  },
  Hallucination: {
    plain:
      "A hallucination is an answer that sounds confident but is not supported by truth or by the provided context. It can happen because language models generate likely text, not verified facts.",
    eli10:
      "It is like someone making up an answer in a serious voice because they do not want to say they do not know.",
    analogy:
      "A student writing an essay without opening the textbook may invent details. RAG hands the student the right pages and asks for citations.",
    why:
      "Reducing hallucination is one of the main reasons companies use RAG. Grounding answers in sources makes AI assistants safer, easier to trust, and easier to audit.",
    technical:
      "RAG reduces hallucination by retrieving evidence, instructing the model to answer only from that evidence, requiring citations, and evaluating groundedness. It does not eliminate risk; retrieval and prompts still need testing.",
    visual:
      "Compare two answer paths: model memory only versus retrieved evidence plus citation requirement.",
    practice:
      "Read an answer and mark every claim that needs a source. Then check whether the retrieved chunks actually support each claim.",
    mistakes: [
      "Treating citations as decoration instead of evidence.",
      "Assuming RAG automatically prevents every unsupported answer.",
      "Failing to test questions where the answer is absent."
    ]
  },
  "What RAG means": {
    plain:
      "RAG means Retrieval-Augmented Generation. Retrieval finds relevant information, augmentation adds that information to the prompt, and generation uses the context to produce an answer.",
    eli10:
      "Before answering, the AI looks up notes. Then it answers using those notes instead of only guessing from memory.",
    analogy:
      "A lawyer does not rely only on memory in court. They bring documents, quote evidence, and connect the evidence to the question.",
    why:
      "Companies use RAG to answer questions about private, changing, or specialized knowledge without retraining a model every time documents change.",
    technical:
      "A RAG system typically has an ingestion path and a query path. Ingestion parses, chunks, embeds, and stores documents. Querying embeds the user question, retrieves top chunks, builds a prompt, calls an LLM, and returns cited output.",
    visual:
      "Draw two lanes: ingestion and question answering. Show vectors connecting the two lanes through retrieval.",
    practice:
      "Explain RAG in three steps: retrieve, augment, generate. Add one company example where each step is visible.",
    mistakes: [
      "Thinking RAG is just uploading a file to a chatbot.",
      "Skipping citations and retrieval inspection.",
      "Using RAG when a simpler database lookup would be better."
    ]
  },
  "Knowledge cutoff": {
    plain:
      "A knowledge cutoff is the point after which a trained model may not know new events or updated facts from training alone. It also may not know private data at all.",
    eli10:
      "If a textbook was printed last year, it cannot include what happened this morning.",
    analogy:
      "A map from 2020 may miss new roads. Retrieval gives the assistant a current map before it answers.",
    why:
      "RAG lets companies answer from current documents without retraining the model for every policy update.",
    technical:
      "A model's parameters contain learned patterns from training data. RAG bypasses cutoff limitations by retrieving external context at query time.",
    visual:
      "Show model memory ending at a cutoff line, then show retrieval adding current documents after that line.",
    practice:
      "Pick a question whose answer changes over time. Explain why RAG is safer than relying on model memory.",
    mistakes: [
      "Assuming an LLM knows today's policy changes.",
      "Not showing document timestamps.",
      "Forgetting stale documents can also create wrong RAG answers."
    ]
  },
  "Private data problem": {
    plain:
      "The private data problem is simple: a general LLM does not automatically know your company's documents, customer records, internal tickets, or team notes.",
    eli10:
      "The AI cannot read your notebook unless you show it the right page.",
    analogy:
      "A consultant can be smart but still needs access to your files before giving company-specific advice.",
    why:
      "This is one of the strongest business reasons for RAG. Retrieval connects private documents to the assistant at answer time while keeping access controllable.",
    technical:
      "Private-data RAG must combine ingestion, access control, metadata filters, secure storage, audit logs, and answer grounding. The model should only see chunks the user is allowed to access.",
    visual:
      "Draw private documents behind a permission gate, then retrieval returning only allowed chunks.",
    practice:
      "Design three metadata fields needed to prevent one department from seeing another department's documents.",
    mistakes: [
      "Uploading all private documents into one shared index without permissions.",
      "Confusing model knowledge with retrieved user-authorized context.",
      "Logging private context carelessly."
    ]
  },
  "Need for sources": {
    plain:
      "Sources show where an answer came from. In RAG, citations are not decoration; they let users verify claims and help developers debug retrieval quality.",
    eli10:
      "If someone gives you an answer, you can ask: where did you find that?",
    analogy:
      "A research paper is stronger when it cites the exact pages it used.",
    why:
      "Companies need sources for trust, compliance, support handoff, and human review.",
    technical:
      "Source-aware RAG keeps chunk IDs, document names, page numbers, headings, timestamps, and permissions attached from ingestion through answer rendering.",
    visual:
      "Show each answer sentence connected to a source card with chunk ID and document metadata.",
    practice:
      "Take one answer and add citations for each factual claim. Mark any claim that has no supporting source.",
    mistakes: [
      "Showing document names but not the actual supporting passage.",
      "Citing chunks that do not support the claim.",
      "Dropping metadata during chunking."
    ]
  },
  "Retrieval step": {
    plain:
      "The retrieval step finds the most relevant chunks for the user's question. It is the evidence-gathering phase of RAG.",
    eli10:
      "Before answering, the assistant searches the notes and picks the pages that look most useful.",
    analogy:
      "A detective gathers evidence before making a conclusion.",
    why:
      "If retrieval fails, generation starts with weak evidence. Many bad RAG answers are retrieval problems wearing a generation costume.",
    technical:
      "Retrieval can use vector search, keyword search, hybrid search, filters, query rewriting, and reranking. The output should include scores and metadata for inspection.",
    visual:
      "Draw a user question turning into a query vector, then nearest chunks returning with scores.",
    practice:
      "For one question, list the top three chunks you expect to retrieve and explain why each should rank highly.",
    mistakes: [
      "Judging the final answer without inspecting retrieved chunks.",
      "Ignoring metadata filters.",
      "Retrieving too few or too many chunks without testing."
    ]
  },
  "Augmentation step": {
    plain:
      "Augmentation means adding retrieved evidence to the model prompt. This is where search results become usable context for generation.",
    eli10:
      "After finding the right notes, you put them into the question so the helper can read them before answering.",
    analogy:
      "It is like attaching supporting documents to an email before asking a colleague for a decision.",
    why:
      "Good augmentation keeps context clear, source-labeled, and compact. Bad augmentation creates noisy prompts and weak citations.",
    technical:
      "The prompt should separate instructions, retrieved chunks, user question, and answer format. Chunks need stable IDs so the model can cite them.",
    visual:
      "Show retrieved chunks being inserted into a prompt template with chunk IDs.",
    practice:
      "Write a context block for two chunks using labels like [chunk 1] and [chunk 2].",
    mistakes: [
      "Pasting raw chunks without boundaries.",
      "Letting retrieved text act like instructions.",
      "Including duplicate or irrelevant evidence."
    ]
  },
  "Generation step": {
    plain:
      "Generation is the final answer-writing step. The model uses the prompt, retrieved context, and instructions to produce a response.",
    eli10:
      "Now that the helper has the notes, it writes the answer.",
    analogy:
      "A journalist writes an article after reviewing source material, but should not invent quotes.",
    why:
      "Generation must be grounded. The answer should reflect the evidence, cite sources, and refuse unsupported questions.",
    technical:
      "Generation settings include model choice, temperature, max tokens, streaming, and answer format. RAG-specific generation uses strict context rules and post-answer checks.",
    visual:
      "Draw the prompt entering the LLM and a cited answer leaving it, with a guardrail checking source support.",
    practice:
      "Rewrite a loose answer into a grounded answer that cites chunks and removes unsupported claims.",
    mistakes: [
      "Letting the model answer from memory when context is missing.",
      "Using a creative answer style for factual support tasks.",
      "Skipping answer verification."
    ]
  },
  "Real company use cases": {
    plain:
      "Companies use RAG when employees or customers need answers from changing, private, or large document collections.",
    eli10:
      "A company has many rulebooks and notes. RAG helps people ask questions instead of searching every file by hand.",
    analogy:
      "It is like a knowledgeable internal librarian who can quote the right shelf and page.",
    why:
      "RAG can reduce support workload, speed research, improve onboarding, and make internal knowledge easier to use while keeping sources visible.",
    technical:
      "Common systems include policy assistants, documentation chatbots, support copilots, research assistants, SOC analyst helpers, and legal review tools. Each needs different permissions, evaluation sets, and risk controls.",
    visual:
      "Map use cases to document types: HR policies, developer docs, tickets, legal contracts, security reports, research PDFs.",
    practice:
      "Choose one company use case and define users, documents, permissions, success metrics, and failure risks.",
    mistakes: [
      "Building a chatbot before defining the document workflow.",
      "Ignoring who is allowed to see which source.",
      "Measuring demos instead of business outcomes."
    ]
  },
  "What is chunking?": {
    plain:
      "Chunking means splitting a long document into smaller pieces before embedding and retrieval. Good chunks are large enough to contain meaning but small enough to be focused.",
    eli10:
      "Instead of giving the AI a whole textbook, you cut it into useful pages or sections so it can find the right part quickly.",
    analogy:
      "A recipe book is easier to search when each recipe is separate. If all recipes are one giant page, search becomes messy.",
    why:
      "Chunking is one of the biggest RAG quality levers. Bad chunks produce weak retrieval, noisy context, higher cost, and more hallucination risk.",
    technical:
      "Chunking strategies include fixed-size windows, sentence splitting, paragraph splitting, recursive splitting, and semantic splitting. Overlap keeps context from being cut at a boundary, but too much overlap creates duplication.",
    visual:
      "Show a document as a long bar, then cut it into overlapping blocks with labels for chunk ID, page, section, and source.",
    practice:
      "Take a policy paragraph and split it three ways: too small, too large, and just right. Explain which version would retrieve best.",
    mistakes: [
      "Using one chunk size for every document type.",
      "Cutting tables or procedures in the middle.",
      "Forgetting metadata such as page, heading, and source."
    ]
  },
  "Chunk size": {
    plain:
      "Chunk size is how much text goes into each chunk. It shapes retrieval focus, source readability, context cost, and answer quality.",
    eli10:
      "Small pieces are easy to search but may miss the full idea. Huge pieces contain more context but can be messy.",
    analogy:
      "A puzzle piece should be big enough to show useful detail but not so big that it covers the whole table.",
    why:
      "Choosing chunk size is one of the fastest ways to improve or damage RAG quality.",
    technical:
      "A common starting point is a few hundred tokens, but the right size depends on document structure, answer type, model context, and retrieval evaluation.",
    visual:
      "Show the same paragraph split into tiny, medium, and huge chunks, then compare what a query would retrieve.",
    practice:
      "Pick a document type and propose a starting chunk size. Explain how you would test whether it is too small or too large.",
    mistakes: [
      "Using huge chunks to avoid thinking about structure.",
      "Using tiny chunks that lose definitions or steps.",
      "Not changing chunk size for tables, policies, and code."
    ]
  },
  "Chunk overlap": {
    plain:
      "Chunk overlap repeats a small amount of text between neighboring chunks so meaning is not lost at boundaries.",
    eli10:
      "If you cut a story into pages, overlap repeats the last few lines so the next page still makes sense.",
    analogy:
      "Hikers on a trail pass messages forward so the next group does not lose context.",
    why:
      "Overlap helps when answers span a chunk boundary, but too much overlap creates duplicate retrieval results and wasted tokens.",
    technical:
      "Overlap is usually smaller than chunk size. You should tune it with retrieval tests and deduplicate similar chunks before building context.",
    visual:
      "Draw three chunks as bars with shaded overlapping regions.",
    practice:
      "Compare zero overlap, 10 percent overlap, and 30 percent overlap for a procedural document.",
    mistakes: [
      "Setting overlap so high that many chunks are nearly identical.",
      "Using no overlap for dense explanations.",
      "Forgetting to deduplicate retrieved chunks."
    ]
  },
  "What is an embedding?": {
    plain:
      "An embedding is a list of numbers that represents the meaning of text. Text with similar meaning should have vectors that are close together.",
    eli10:
      "An embedding is like turning a sentence into a map location. Sentences about similar ideas land near each other.",
    analogy:
      "In a grocery store, apples and oranges are closer to each other than apples and batteries. Embeddings make a similar kind of meaning neighborhood for text.",
    why:
      "Embeddings make semantic search possible. They let a RAG system find relevant chunks even when the user does not use the exact same words as the document.",
    technical:
      "An embedding model converts text into a high-dimensional vector. Similarity functions such as cosine similarity compare query vectors to document vectors and rank the closest chunks.",
    visual:
      "Plot simple points on a 2D map: refund policy, return policy, password reset, and server deployment. Similar topics should cluster.",
    practice:
      "Write three different questions that should retrieve the same policy chunk even though they use different wording.",
    mistakes: [
      "Expecting embeddings to understand every domain abbreviation automatically.",
      "Embedding noisy text without cleaning it first.",
      "Comparing embeddings from different models as if they share the same space."
    ]
  },
  "What is a vector database?": {
    plain:
      "A vector database stores embeddings and searches for nearby vectors quickly. It usually stores metadata too, such as document ID, page, section, tenant, and permissions.",
    eli10:
      "It is a special library catalog for meaning. Instead of searching only exact words, it finds nearby ideas.",
    analogy:
      "A normal database can find a book by exact title. A vector database can find books that are about the same idea as your question.",
    why:
      "RAG systems need fast similarity search across many chunks. Vector databases make that practical and add filtering, indexing, and operational tools.",
    technical:
      "Vector stores index high-dimensional vectors with approximate nearest neighbor methods, then return top-K matches. Production systems combine vector score, metadata filters, permissions, and sometimes reranking.",
    visual:
      "Draw chunks as dots in vector space, then draw the query dot and highlight the nearest neighbors.",
    practice:
      "Design metadata fields for a company policy vector store: document type, department, access role, page, section, and last updated date.",
    mistakes: [
      "Storing vectors without useful metadata.",
      "Ignoring tenant and permission filters.",
      "Choosing a vector database before understanding query patterns."
    ]
  },
  "Keyword search vs semantic search": {
    plain:
      "Keyword search finds exact or similar words. Semantic search finds similar meaning. A strong RAG system often uses both because each catches different cases.",
    eli10:
      "Keyword search looks for the same words. Semantic search looks for the same idea.",
    analogy:
      "If you search for 'car repair', keyword search wants those words. Semantic search may also find 'vehicle maintenance'.",
    why:
      "Semantic search helps with natural language questions, but keyword search is still valuable for names, IDs, error codes, legal terms, and exact phrases.",
    technical:
      "Keyword search often uses BM25-style ranking. Semantic search embeds the query and compares it with document embeddings. Hybrid search combines both scores and may rerank the final candidates.",
    visual:
      "Show two columns of results for the same query: exact word matches and meaning matches, then a merged ranked list.",
    practice:
      "Create three queries where keyword search is better and three where semantic search is better.",
    mistakes: [
      "Replacing keyword search entirely when exact terms matter.",
      "Ignoring acronyms, product names, and codes.",
      "Judging search quality without looking at top-K evidence."
    ]
  },
  "Cosine similarity": {
    plain:
      "Cosine similarity measures the angle between two vectors. In RAG, it is often used to estimate how close a query embedding is to a chunk embedding.",
    eli10:
      "If two arrows point in a similar direction, they probably mean similar things.",
    analogy:
      "Two people walking in the same direction are more similar than two people walking opposite ways.",
    why:
      "Similarity scores help rank retrieved chunks, but they are signals, not proof that a chunk answers the question.",
    technical:
      "Cosine similarity compares vector direction rather than raw length. It is common for normalized embedding search, though some systems use dot product or distance metrics.",
    visual:
      "Draw two arrows with a small angle and two arrows with a large angle. Label the small angle as more similar.",
    practice:
      "Look at three retrieval results and decide whether high similarity actually means answer usefulness.",
    mistakes: [
      "Treating similarity score as truth.",
      "Comparing scores across different embedding models.",
      "Ignoring exact terms, filters, and source authority."
    ]
  },
  "Top-K retrieval": {
    plain:
      "Top-K retrieval means returning the K highest-ranked chunks for a query. K is a small number such as 3, 5, or 10.",
    eli10:
      "The assistant chooses the best few pages instead of carrying the whole book.",
    analogy:
      "A search engine showing the first five results is doing a kind of top-K selection.",
    why:
      "Top-K controls the tradeoff between enough evidence and too much noise.",
    technical:
      "Low K may miss evidence. High K may add irrelevant context and increase cost. Many systems retrieve a larger candidate set, rerank it, then pass a smaller K to the prompt.",
    visual:
      "Show a ranked list of chunks with only the top K highlighted.",
    practice:
      "For a factual policy question, compare K=2, K=5, and K=10. Predict which will be easiest for the model to answer from.",
    mistakes: [
      "Using a fixed K without evaluation.",
      "Sending all retrieved candidates to the model.",
      "Ignoring duplicate chunks in the top results."
    ]
  },
  "Hybrid search": {
    plain:
      "Hybrid search combines keyword search and semantic vector search. It catches exact terms and meaning-based matches together.",
    eli10:
      "It searches for the same words and the same idea at the same time.",
    analogy:
      "A good librarian listens for exact book titles and also understands what topic you mean.",
    why:
      "Hybrid search is often stronger than pure vector search for enterprise RAG because real documents contain IDs, acronyms, product names, and exact legal language.",
    technical:
      "A hybrid retriever merges BM25-style keyword scores with vector similarity scores, then may rerank the combined candidate list.",
    visual:
      "Draw keyword results and vector results merging into one candidate list.",
    practice:
      "Write one query where an error code matters and one where meaning matters. Explain why hybrid search helps both.",
    mistakes: [
      "Using only semantic search for exact identifiers.",
      "Merging scores without testing ranking quality.",
      "Forgetting metadata filters before or after hybrid retrieval."
    ]
  },
  "Source citations": {
    plain:
      "Source citations connect the answer to the chunks used as evidence. They help users verify the answer and help developers debug whether retrieval worked.",
    eli10:
      "A citation is the answer saying, 'I found this on this page.'",
    analogy:
      "A teacher asks you to show your work. Citations are how a RAG assistant shows its work.",
    why:
      "Citations are essential for trust, compliance, and quality review in real systems.",
    technical:
      "Citations require preserving chunk IDs and metadata through the pipeline. The prompt should instruct the model to cite only provided chunks, and the UI should show source cards.",
    visual:
      "Draw answer sentences with small citation badges that open source chunks.",
    practice:
      "Take a retrieved context block and write an answer with citations after each factual sentence.",
    mistakes: [
      "Citing sources that were retrieved but not actually used.",
      "Using vague citations like 'company policy' without page or chunk detail.",
      "Letting the model invent citation IDs."
    ]
  },
  "Grounded answering": {
    plain:
      "Grounded answering means the model's response is supported by the retrieved context. Every important claim should trace back to evidence.",
    eli10:
      "The AI should answer from the notes in front of it, not from imagination.",
    analogy:
      "A news report should be based on confirmed sources, not rumors.",
    why:
      "Grounding is the heart of trustworthy RAG. It lowers hallucination risk and makes answers auditable.",
    technical:
      "Grounding combines retrieval quality, prompt rules, citation behavior, refusal behavior, and evaluation. It can be checked by comparing answer claims with retrieved chunks.",
    visual:
      "Show answer claims linked by lines to specific context chunks.",
    practice:
      "Highlight each claim in an answer and mark supported, unsupported, or unclear.",
    mistakes: [
      "Calling an answer grounded just because sources are displayed.",
      "Allowing unsupported summary sentences.",
      "Not evaluating groundedness on missing-answer questions."
    ]
  },
  "Refusal when context missing": {
    plain:
      "A safe RAG assistant should refuse to answer when the retrieved context does not contain the answer. The refusal should be clear and not apologetically invent details.",
    eli10:
      "If the notes do not say the answer, the helper should say, 'I don't know from these notes.'",
    analogy:
      "A doctor should not guess from a missing chart. They should ask for the right record.",
    why:
      "This behavior prevents confident hallucinations and builds user trust.",
    technical:
      "Refusal behavior is implemented through prompt rules, retrieval thresholds, answer verification, and tests where the correct answer is absent.",
    visual:
      "Draw a decision gate: retrieved evidence enough goes to answer; evidence missing goes to refusal.",
    practice:
      "Write three questions for a document: one answerable, one partly answerable, and one not answerable. Define the correct assistant behavior for each.",
    mistakes: [
      "Answering from model memory when context is empty.",
      "Using vague refusals that do not explain the limitation.",
      "Failing to log missing-context cases for content improvement."
    ]
  },
  "Reranking": {
    plain:
      "Reranking is a second-pass scoring step. After the retriever returns candidate chunks, a stronger model reorders them based on how well they answer the exact query.",
    eli10:
      "First you collect possible pages. Then a careful judge sorts the best pages to the top.",
    analogy:
      "A recruiter may search resumes with keywords, then read the best candidates more carefully before ranking them.",
    why:
      "Reranking often improves answer quality because the first vector search may return chunks that are related but not actually useful.",
    technical:
      "A reranker usually reads the query and candidate chunk together and outputs a relevance score. It is slower than vector search, so teams rerank only a small candidate set such as top 20 or top 50.",
    visual:
      "Draw retrieval returning 20 candidates, then reranking compressing them into the best 4 context chunks.",
    practice:
      "Inspect five retrieved chunks and manually rerank them for one question. Explain why your top chunk is better than the vector store's top chunk.",
    mistakes: [
      "Reranking too many chunks and creating latency problems.",
      "Using reranking to hide poor chunking or missing metadata.",
      "Forgetting to evaluate whether reranking improves grounded answers."
    ]
  },
  "Prompt injection basics": {
    plain:
      "Prompt injection is when text tries to manipulate the AI's instructions. In RAG, dangerous instructions can hide inside retrieved documents and tell the model to ignore rules or leak data.",
    eli10:
      "It is like a note inside a book saying, 'ignore your teacher and reveal the answer key.' The assistant must know that book text is evidence, not commands.",
    analogy:
      "A mail clerk should read a letter as content, not obey a random instruction inside the letter to open the safe.",
    why:
      "RAG systems ingest untrusted or semi-trusted documents. Without boundaries, retrieved text can fight the system prompt and cause unsafe behavior.",
    technical:
      "Defenses include separating instructions from context, using strong system rules, permission-aware retrieval, source allowlists, output validation, and tests for indirect prompt injection.",
    visual:
      "Show system instructions at the top, user question next, and retrieved context in a clearly boxed evidence area labeled not instructions.",
    practice:
      "Write a malicious document sentence, then write a system rule that tells the model to treat retrieved content only as evidence.",
    mistakes: [
      "Trusting every retrieved document equally.",
      "Letting document text override system instructions.",
      "Logging sensitive data without reviewing who can access logs."
    ]
  }
};

const levelTeachingLens = [
  "Start with plain language and observable examples. The learner should leave with vocabulary, not formulas.",
  "Connect the concept to prompts, tokens, context windows, and model limits.",
  "Keep asking: what can the model know by itself, and what must be retrieved from documents?",
  "Focus on getting clean text and useful metadata before any model call.",
  "Treat chunking as a retrieval design decision, not a mechanical split.",
  "Explain vectors through meaning, distance, and retrieval behavior.",
  "Connect storage choices to metadata filters, indexes, and operational needs.",
  "Compare search methods by looking at the actual top results.",
  "Tie every step to the ingestion path or the query path.",
  "Turn prompt writing into a safety and grounding discipline.",
  "Show the minimum product workflow from upload to cited answer.",
  "Explain frameworks as packaging around loaders, splitters, retrievers, and chains.",
  "Measure retrieval, answer quality, faithfulness, and failure cases.",
  "Improve one bottleneck at a time and verify it with golden questions.",
  "Introduce advanced patterns only after the basic pipeline is inspectable.",
  "Assume private data, hostile text, and permission boundaries exist.",
  "Think in services, queues, storage, observability, and cost controls.",
  "Highlight privacy benefits and hardware tradeoffs of local models.",
  "Map each use case to risk, data freshness, permissions, and evaluation needs.",
  "Turn the concept into a portfolio project with test cases and source citations.",
  "Connect expert ideas to architecture choices and defensive evaluation."
];

function fallbackProfile(topic, level) {
  const cleanTitle = topic.replace(/\bconcept\b/i, "").trim();
  const lens = levelTeachingLens[level.number] || "Connect this idea to retrieval, generation, evaluation, and production tradeoffs.";

  return {
    plain:
      `${cleanTitle} is a practical RAG concept that affects how information moves from raw documents to a grounded answer. Learn it by asking what problem it solves, what input it needs, and how it changes the final user experience.`,
    eli10:
      `Imagine building a study helper. ${cleanTitle} is one rule or tool that helps the helper find the right notes, use them carefully, and avoid guessing.`,
    analogy:
      `${cleanTitle} is like a station in an assembly line. If this station does sloppy work, the final product may still look polished but will be harder to trust.`,
    why:
      `${cleanTitle} matters because RAG quality is cumulative. Small decisions about documents, search, prompts, security, and evaluation stack together into either a reliable assistant or a fragile demo.`,
    technical:
      `${lens} In a real implementation, you should define the input, output, failure modes, metrics, and logs for ${cleanTitle}. Then test it with questions where the answer exists, questions where it is missing, and questions where permissions matter.`,
    visual:
      `Draw ${cleanTitle} as a labeled step in the RAG pipeline. Add arrows for input, output, metadata, and the failure signal you would monitor.`,
    practice:
      `Create a tiny test case for ${cleanTitle}: one document snippet, one user question, the expected retrieved evidence, and one thing that could go wrong.`,
    mistakes: [
      `Treating ${cleanTitle} as a checkbox instead of a design choice.`,
      "Changing multiple pipeline parts at once and not knowing what improved.",
      "Skipping examples where the correct behavior is to say the answer is not in the context."
    ]
  };
}

function profileFor(topic, level) {
  const fallback = fallbackProfile(topic, level);
  return { ...fallback, ...(coreLessonProfiles[topic] || {}) };
}

function codeExampleFor(topic, level) {
  if (/prompt|grounded|citation|refusal/i.test(topic)) {
    return `const prompt = [
  "You are a grounded RAG assistant.",
  "Use only the provided context.",
  "If the answer is missing, say: I don't know based on the provided context.",
  "Cite sources as [chunk_id].",
  "",
  "Context:",
  retrievedChunks.map(chunk => \`[\${chunk.id}] \${chunk.text}\`).join("\\n\\n"),
  "",
  \`Question: \${question}\`
].join("\\n");`;
  }

  if (/chunk|split|overlap/i.test(topic)) {
    return `function chunkText(words, size = 180, overlap = 30) {
  const chunks = [];
  for (let start = 0; start < words.length; start += size - overlap) {
    const end = Math.min(start + size, words.length);
    chunks.push({
      text: words.slice(start, end).join(" "),
      metadata: { startWord: start, endWord: end }
    });
  }
  return chunks;
}`;
  }

  if (/embedding|vector|semantic|similarity|top-k|database|pgvector|chroma|qdrant|weaviate|pinecone/i.test(topic)) {
    return `const queryVector = await embed(question);
const matches = await vectorStore.search({
  vector: queryVector,
  topK: 5,
  filter: { tenantId: user.tenantId, visibility: "allowed" }
});

return matches.map(match => ({
  chunkId: match.id,
  score: match.score,
  source: match.metadata.source
}));`;
  }

  if (/evaluation|quality|precision|recall|faithfulness|groundedness|ragas/i.test(topic)) {
    return `const evaluation = {
  question,
  expectedSource: "policy-page-4",
  retrievedChunkIds: matches.map(match => match.id),
  answer,
  checks: {
    retrievedExpectedSource: matches.some(match => match.id === "policy-page-4"),
    citesSources: /\\[chunk/.test(answer),
    refusesWhenMissing: answer.includes("I don't know")
  }
};`;
  }

  if (/security|privacy|injection|access|tenant|pii|upload|api key/i.test(topic)) {
    return `const allowedChunks = retrievedChunks.filter(chunk => {
  return chunk.tenantId === user.tenantId &&
    chunk.allowedRoles.includes(user.role) &&
    !chunk.metadata.containsSensitiveLeak;
});

if (allowedChunks.length === 0) {
  return "I don't know based on the provided context.";
}`;
  }

  if (level.number >= 8 || /rag|retrieval|generation|ingestion|pipeline|source|logging/i.test(topic)) {
    return `async function answerWithRag(question, user) {
  const queryVector = await embed(question);
  const chunks = await retrieve(queryVector, { topK: 4, user });
  const prompt = buildGroundedPrompt(question, chunks);
  const answer = await llm.generate(prompt);
  await logRagRun({ question, chunks, answer, userId: user.id });
  return { answer, sources: chunks.map(chunk => chunk.source) };
}`;
  }

  return null;
}

function lessonBody({ topic, level, nextTopic, localIndex }) {
  const profile = profileFor(topic, level);
  const codeExample = codeExampleFor(topic, level);

  return {
    title: topic,
    slug: `${level.number}-${slugify(topic)}-${localIndex + 1}`,
    difficulty: level.difficulty,
    estimatedMinutes: level.number < 3 ? 12 : level.number < 10 ? 16 : 22,
    simpleExplanation: paragraphs(
      profile.plain,
      `RAG lens: while learning ${topic}, always ask how this changes retrieval, context quality, model behavior, citations, or safety.`,
      "Checkpoint: you should be able to explain the concept in plain English and point to where it appears in a RAG system."
    ),
    eli10: profile.eli10,
    analogy: profile.analogy,
    whyMatters: profile.why,
    technicalExplanation: paragraphs(
      profile.technical,
      "Production note: define inputs, outputs, metadata, failure cases, and evaluation checks. A concept is not truly learned until you can debug it when an answer is wrong."
    ),
    codeExample,
    visualIdea: profile.visual,
    commonMistakes: profile.mistakes,
    miniPractice: paragraphs(
      profile.practice,
      "Stretch task: add one metric you would watch and one example question that should fail safely."
    ),
    summary: `${topic}: ${profile.plain.slice(0, 220)}${profile.plain.length > 220 ? "..." : ""}`,
    nextLesson: nextTopic ? `Next, study "${nextTopic}" and connect it back to ${topic}.` : null,
    tags: [
      "rag",
      "ai",
      level.difficulty.toLowerCase(),
      ...topic
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
    ]
  };
}

function makeQuizQuestions({ lessonId, topic, difficulty, sortOrder }) {
  const profile = profileFor(topic, { number: 0 });
  const secondTypes = ["TRUE_FALSE", "SCENARIO", "CHUNKING_DECISION", "RETRIEVAL_DIAGNOSIS", "ORDERING"];
  const secondType = secondTypes[sortOrder % secondTypes.length];
  const base = [
    {
      lessonId,
      type: "MCQ",
      question: `Which statement best explains "${topic}" for a RAG builder?`,
      options: [
        profile.plain.slice(0, 140),
        "To memorize vendor pricing tables",
        "To avoid using documents in AI systems",
        "To replace all software engineering practices"
      ],
      correctAnswer: { index: 0 },
      explanation: profile.why,
      difficulty,
      sortOrder: sortOrder * 2
    }
  ];

  if (secondType === "TRUE_FALSE") {
    base.push({
      lessonId,
      type: "TRUE_FALSE",
      question: `True or false: ${topic} should be evaluated in the context of the full RAG pipeline, not as an isolated buzzword.`,
      options: [true, false],
      correctAnswer: { value: true },
      explanation: "A RAG decision affects retrieval, prompting, source quality, latency, cost, and user trust.",
      difficulty,
      sortOrder: sortOrder * 2 + 1
    });
  } else if (secondType === "ORDERING") {
    base.push({
      lessonId,
      type: "ORDERING",
      question: "Put the core RAG answer flow in the correct order.",
      options: ["User asks a question", "Retrieve relevant chunks", "Build a context prompt", "Generate a grounded answer"],
      correctAnswer: { order: [0, 1, 2, 3] },
      explanation: "A question is embedded or searched, relevant chunks are retrieved, context is added to a prompt, and the model answers from that context.",
      difficulty,
      sortOrder: sortOrder * 2 + 1
    });
  } else if (secondType === "CHUNKING_DECISION") {
    base.push({
      lessonId,
      type: "CHUNKING_DECISION",
      question: `A learner splits every document into huge 20-page chunks while studying ${topic}. What is the likely issue?`,
      options: [
        "Retrieved context may be noisy and expensive",
        "The model will automatically become perfectly factual",
        "Metadata will no longer be needed",
        "Search quality cannot be affected by chunk size"
      ],
      correctAnswer: { index: 0 },
      explanation: "Oversized chunks often bury the answer in unrelated context and waste the model context window.",
      difficulty,
      sortOrder: sortOrder * 2 + 1
    });
  } else if (secondType === "RETRIEVAL_DIAGNOSIS") {
    base.push({
      lessonId,
      type: "RETRIEVAL_DIAGNOSIS",
      question: `A RAG assistant gives weak answers about ${topic} because the top chunks are unrelated. What should you inspect first?`,
      options: [
        "Query, chunk quality, embedding choice, and ranking scores",
        "Only the website color palette",
        "Only the final model temperature",
        "The user's browser zoom level"
      ],
      correctAnswer: { index: 0 },
      explanation: "Poor answers often start with poor retrieval, so inspect the retrieval evidence before blaming generation.",
      difficulty,
      sortOrder: sortOrder * 2 + 1
    });
  } else {
    base.push({
      lessonId,
      type: "SCENARIO",
      question: `A company wants answers about private policy documents while learning ${topic}. What is the safest first design principle?`,
      options: [
        "Retrieve only permitted source chunks and cite them",
        "Send every private file to every user",
        "Ignore logs and evaluation",
        "Ask the model to guess when context is missing"
      ],
      correctAnswer: { index: 0 },
      explanation: "RAG should be permission-aware and grounded in retrieved evidence, especially with private documents.",
      difficulty,
      sortOrder: sortOrder * 2 + 1
    });
  }

  base.push({
    lessonId,
    type: "SCENARIO",
    question: `You are debugging a RAG assistant and suspect "${topic}" is the weak point. What is the most professional next step?`,
    options: [
      "Create a small test case with a document snippet, expected evidence, and expected answer behavior",
      "Change the UI colors and assume retrieval improved",
      "Increase model temperature so the answer sounds more creative",
      "Remove citations to make the answer shorter"
    ],
    correctAnswer: { index: 0 },
    explanation:
      "Professional RAG work is evidence-driven. A tiny reproducible test case helps you inspect retrieval, prompting, and groundedness without guessing.",
    difficulty,
    sortOrder: sortOrder * 2 + 2
  });

  return base;
}

function makeExercise(module, index) {
  const exerciseTypes = [
    "Choose good chunk size",
    "Identify bad chunking",
    "Design metadata schema",
    "Diagnose poor retrieval",
    "Improve prompt template",
    "Identify hallucination",
    "Choose vector database",
    "Write RAG system requirements",
    "Evaluate answer groundedness",
    "Fix unsafe RAG design"
  ];
  const title = exerciseTypes[index % exerciseTypes.length];
  return {
    title: `${title}: ${module.title}`,
    scenario:
      `You are helping a team apply ${module.title} in a small RAG assistant. The current demo sometimes retrieves related chunks but misses the exact evidence needed for a grounded answer.`,
    prompt:
      `Make a practical decision for "${title}". Include the current symptom, the change you would make, why it should help, and how you would test it with at least two questions.`,
    expectedOutcome:
      "A strong answer names a concrete change, explains the retrieval or safety tradeoff, identifies a measurable success signal, and includes a failure case where the assistant should refuse.",
    hints: [
      "Inspect the retrieved chunks before changing the generator prompt.",
      "Prefer changes that can be tested with golden questions.",
      "Keep metadata, permissions, citations, and missing-context behavior visible."
    ],
    difficulty: module.difficulty,
    tags: ["practice", "rag", slugify(title).replace(/-/g, " ")]
  };
}

async function clearDatabase() {
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.note.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.ragQueryLog.deleteMany();
  await prisma.ragChunk.deleteMany();
  await prisma.ragDocument.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.practiceExercise.deleteMany();
  await prisma.guidedProject.deleteMany();
  await prisma.toolReference.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.level.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const [adminPassword, studentPassword] = await Promise.all([bcrypt.hash("Admin123!", 12), bcrypt.hash("Student123!", 12)]);

  const admin = await prisma.user.create({
    data: {
      name: "Ali Rayyan Admin",
      email: "admin@ragmastery.local",
      passwordHash: adminPassword,
      role: "ADMIN",
      streakCount: 7,
      lastActiveAt: new Date()
    }
  });

  const student = await prisma.user.create({
    data: {
      name: "Demo Student",
      email: "student@ragmastery.local",
      passwordHash: studentPassword,
      role: "STUDENT",
      streakCount: 3,
      lastActiveAt: new Date()
    }
  });

  return { admin, student };
}

async function seedCurriculum() {
  const allLessons = [];
  const createdLevels = [];
  let globalLessonIndex = 0;
  let moduleIndex = 0;

  for (const level of levelBlueprints) {
    const createdLevel = await prisma.level.create({
      data: {
        number: level.number,
        title: level.title,
        description: level.description,
        difficulty: level.difficulty,
        sortOrder: level.number
      }
    });
    createdLevels.push(createdLevel);

    const topicGroups = chunkTopics(level.topics, 4);
    for (let groupIndex = 0; groupIndex < topicGroups.length; groupIndex += 1) {
      const group = topicGroups[groupIndex];
      const createdModule = await prisma.module.create({
        data: {
          levelId: createdLevel.id,
          title: `${level.title.replace(/^LEVEL \d+:\s*/, "")} - Module ${groupIndex + 1}`,
          description: `Covers ${group.join(", ")} with beginner-friendly explanations and practical RAG context.`,
          sortOrder: groupIndex + 1
        }
      });

      await prisma.practiceExercise.create({
        data: {
          ...makeExercise({ ...createdModule, difficulty: level.difficulty }, moduleIndex),
          moduleId: createdModule.id
        }
      });
      moduleIndex += 1;

      for (let topicIndex = 0; topicIndex < group.length; topicIndex += 1) {
        const topic = group[topicIndex];
        const flatTopics = level.topics;
        const levelTopicIndex = groupIndex * 4 + topicIndex;
        const nextTopic = flatTopics[levelTopicIndex + 1] || levelBlueprints[level.number + 1]?.topics?.[0] || null;
        const lesson = await prisma.lesson.create({
          data: {
            ...lessonBody({ topic, level, nextTopic, localIndex: globalLessonIndex }),
            moduleId: createdModule.id,
            sortOrder: topicIndex + 1
          }
        });
        allLessons.push(lesson);

        await prisma.quizQuestion.createMany({
          data: makeQuizQuestions({
            lessonId: lesson.id,
            topic,
            difficulty: level.difficulty,
            sortOrder: globalLessonIndex
          })
        });
        globalLessonIndex += 1;
      }
    }
  }

  return { createdLevels, allLessons };
}

async function seedProjects(createdLevels) {
  for (let index = 0; index < guidedProjects.length; index += 1) {
    const title = guidedProjects[index];
    const level = createdLevels.find((item) => item.number === 19) || createdLevels[createdLevels.length - 1];
    await prisma.guidedProject.create({
      data: {
        title,
        slug: slugify(title),
        levelId: level.id,
        goal: `Build a practical ${title} that retrieves source chunks before generating an answer.`,
        requirements: [
          "Accept local TXT or Markdown content",
          "Chunk and embed the text",
          "Retrieve top matching chunks",
          "Generate or mock a grounded answer",
          "Show citations and retrieval scores"
        ],
        architecture:
          "React client -> Express API -> ingestion service -> chunker -> embedding/vector store -> retriever -> grounded answer service.",
        steps: [
          "Create the document upload UI.",
          "Extract text and clean whitespace.",
          "Split the text into overlapping chunks.",
          "Generate embeddings for each chunk.",
          "Store chunks with metadata.",
          "Embed the user question and retrieve top chunks.",
          "Build a prompt with context and citation instructions.",
          "Render answer, sources, and evaluation notes."
        ],
        starterCode:
          "const chunks = chunkText(documentText, { chunkSize: 700, overlap: 100 });\nconst vectors = chunks.map(chunk => embed(chunk.content));",
        finalCode:
          "const matches = retrieve(question, vectors, { topK: 4 });\nreturn answerFromContext(question, matches, { citeSources: true });",
        explanation:
          "The project teaches the full RAG loop while keeping the model provider optional. Mock mode is enough to understand chunking, retrieval, and citations.",
        testing:
          "Ask golden questions with known answers, inspect retrieved chunks, and verify that unsupported questions return an uncertainty response.",
        commonMistakes: [
          "Skipping source display",
          "Using giant chunks",
          "Letting the model answer without context",
          "Not testing questions where the answer is absent"
        ],
        extensionIdeas: [
          "Add hybrid keyword search",
          "Add reranking",
          "Add conversation memory",
          "Add role-based document permissions"
        ]
      }
    });
  }
}

async function seedReferencesAndAchievements() {
  await prisma.toolReference.createMany({
    data: toolReferences.map(([name, category, url, description, pricing]) => ({
      name,
      category,
      url,
      description,
      pricing,
      tags: [category.toLowerCase(), "rag"]
    }))
  });

  await prisma.achievement.createMany({
    data: achievementBlueprints.map(([code, title, description, criteria, points, icon]) => ({
      code,
      title,
      description,
      criteria,
      points,
      icon
    }))
  });
}

async function seedStudentActivity(student, allLessons) {
  const completedLessons = allLessons.slice(0, 12);
  for (const lesson of completedLessons) {
    await prisma.userProgress.create({
      data: {
        userId: student.id,
        lessonId: lesson.id,
        status: "COMPLETED",
        score: 90,
        completedAt: new Date()
      }
    });
  }

  for (const lesson of allLessons.slice(2, 7)) {
    await prisma.bookmark.create({
      data: { userId: student.id, lessonId: lesson.id }
    });
  }

  await prisma.note.create({
    data: {
      userId: student.id,
      lessonId: allLessons[0].id,
      content: "AI is a broad idea. RAG is a practical way to make AI answer with trusted documents."
    }
  });

  const firstQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: allLessons[0].id },
    orderBy: { sortOrder: "asc" }
  });
  await prisma.quizAttempt.create({
    data: {
      userId: student.id,
      lessonId: allLessons[0].id,
      score: firstQuestions.length,
      total: firstQuestions.length,
      answers: Object.fromEntries(firstQuestions.map((question) => [question.id, question.type === "TRUE_FALSE" ? true : 0])),
      feedback: firstQuestions.map((question) => ({
        questionId: question.id,
        correct: true,
        explanation: question.explanation
      }))
    }
  });

  const achievements = await prisma.achievement.findMany({
    where: { code: { in: ["FIRST_LESSON", "TEN_LESSONS", "QUIZ_TAKER", "CURIOUS_BOOKMARKER"] } }
  });
  await prisma.userAchievement.createMany({
    data: achievements.map((achievement) => ({
      userId: student.id,
      achievementId: achievement.id
    }))
  });
}

async function main() {
  console.log("Clearing existing data...");
  await clearDatabase();

  console.log("Seeding users...");
  const { student } = await seedUsers();

  console.log("Seeding curriculum...");
  const { createdLevels, allLessons } = await seedCurriculum();

  console.log("Seeding projects, tools, and achievements...");
  await seedProjects(createdLevels);
  await seedReferencesAndAchievements();

  console.log("Seeding demo student activity...");
  await seedStudentActivity(student, allLessons);

  const counts = {
    levels: await prisma.level.count(),
    modules: await prisma.module.count(),
    lessons: await prisma.lesson.count(),
    quizQuestions: await prisma.quizQuestion.count(),
    exercises: await prisma.practiceExercise.count(),
    projects: await prisma.guidedProject.count(),
    tools: await prisma.toolReference.count(),
    achievements: await prisma.achievement.count()
  };

  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
