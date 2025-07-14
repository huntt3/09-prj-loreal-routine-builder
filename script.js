/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

const workerUrl = "https://loreal-worker.trevorhunt987.workers.dev/";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

const messages = [
  {
    role: "system",
    content: `You are a professional but friendly Loreal expert and advocate. You guide the user to L'Oreal products, beauty routines and recommendations.\n\nIf a user's query is unrelated to L'Oreal products, L'Oreal routines and L'Oreal recommendations, respond by stating that you do not know. L'Oreal may be spelled Loreal, L'Oréal among others.`,
  },
];

// Reference for appending messages (use chatWindow for simplicity)
const chatbotMessages = chatWindow;

// Track if history is shown
let showHistory = false;

// Set initial message
addMessageToChat("assistant", "Hello! How can I help you today?");

// Store loaded prompts for reuse
let loadedPrompts = [];

// Helper function to render messages in the chat window
function renderMessages() {
  chatbotMessages.innerHTML = "";
  if (showHistory) {
    // Show all messages except the system message
    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      addMessageToChat(msg.role === "user" ? "user" : "assistant", msg.content);
    }
  } else {
    // Show only the last user and last assistant message (if they exist)
    let lastUserIdx = -1;
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 1; i--) {
      if (lastUserIdx === -1 && messages[i].role === "user") lastUserIdx = i;
      if (lastAssistantIdx === -1 && messages[i].role === "assistant")
        lastAssistantIdx = i;
      if (lastUserIdx !== -1 && lastAssistantIdx !== -1) break;
    }
    if (lastUserIdx !== -1)
      addMessageToChat("user", messages[lastUserIdx].content);
    if (lastAssistantIdx !== -1)
      addMessageToChat("assistant", messages[lastAssistantIdx].content);
    if (lastUserIdx === -1 && lastAssistantIdx === -1) {
      // If no messages, show the welcome message
      addMessageToChat("assistant", "Hello! How can I help you today?");
    }
  }
}

// Helper function to add messages to the chat window
function addMessageToChat(sender, message) {
  // Create a new div for the message
  const msgDiv = document.createElement("div");
  msgDiv.className = sender === "user" ? "user-message" : "assistant-message";
  msgDiv.innerHTML =
    sender === "user"
      ? `<strong>You:</strong> ${message}`
      : `<strong>Smart Product Advisor:</strong> ${message}`;
  chatbotMessages.appendChild(msgDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (message !== "") {
    sendMessageToOpenAI(message);
    userInput.value = "";
  }
});

// Function to send user input to OpenAI and get a response
async function sendMessageToOpenAI(userInput) {
  // Add the user's message to the messages array
  messages.push({ role: "user", content: userInput });
  renderMessages();

  // Add 'Thinking...' animation
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "assistant-message";
  thinkingDiv.id = "thinking-message";
  thinkingDiv.innerHTML =
    '<strong>Smart Product Advisor:</strong> <span class="thinking-dots">Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
  chatbotMessages.appendChild(thinkingDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

  // Prepare the API request for the Cloudflare Worker
  const apiUrl = workerUrl; // Use the workerUrl instead of OpenAI endpoint
  const headers = {
    "Content-Type": "application/json",
    // No Authorization header needed; worker handles the key
  };
  const body = {
    model: "gpt-4o",
    messages: messages, // Send the full conversation history
    temperature: 0.8, // Make the assistant more creative
    max_tokens: 300, // Keep responses short and focused
  };

  try {
    // Send the request to the Cloudflare Worker
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    // Check for HTTP errors
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();

    // Remove 'Thinking...' animation
    const thinkingMsg = document.getElementById("thinking-message");
    if (thinkingMsg) thinkingMsg.remove();

    // Check if the response contains a valid assistant reply
    const assistantReply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;
    if (!assistantReply) {
      messages.push({
        role: "assistant",
        content: "Sorry, I couldn't understand the response from the server.",
      });
      renderMessages();
      console.error("No valid assistant reply in response:", data);
      return;
    }

    // Add the assistant's reply to the messages array
    messages.push({ role: "assistant", content: assistantReply });
    renderMessages();
  } catch (error) {
    // Remove 'Thinking...' animation
    const thinkingMsg = document.getElementById("thinking-message");
    if (thinkingMsg) thinkingMsg.remove();
    // Show an error message if something goes wrong
    messages.push({
      role: "assistant",
      content:
        "Sorry, there was a problem connecting to the server. Please try again later.",
    });
    renderMessages();
    console.error("API error:", error);
  }
}

// Initial render
renderMessages();
