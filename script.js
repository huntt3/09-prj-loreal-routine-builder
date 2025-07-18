/* Ensure script runs after DOM is fully loaded */
document.addEventListener("DOMContentLoaded", () => {
  /* Get references to DOM elements */
  const categoryFilter = document.getElementById("categoryFilter");
  const productsContainer = document.getElementById("productsContainer");
  const chatForm = document.getElementById("chatForm");
  const chatWindow = document.getElementById("chatWindow");
  const userInput = document.getElementById("userInput");

  let allProducts = [];
  let currentCategory = "";
  let currentSearchTerm = "";

  const workerUrl = "https://loreal-worker-2.trevorhunt987.workers.dev/";

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
    allProducts = data.products;
    return allProducts;
  }

  /* Track selected products */
  let selectedProducts = [];

  /* Save selected products to localStorage */
  function saveSelectedProductsToLocalStorage() {
    localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  }

  /* Load selected products from localStorage */
  function loadSelectedProductsFromLocalStorage() {
    const savedProducts = localStorage.getItem("selectedProducts");
    if (savedProducts) {
      try {
        selectedProducts = JSON.parse(savedProducts);
        updateSelectedProducts();
        updateProductGrid();
      } catch (e) {
        console.error("Failed to parse saved products from localStorage", e);
      }
    }
  }

  /* Clear all selected products */
  function clearSelectedProducts() {
    selectedProducts = [];
    saveSelectedProductsToLocalStorage();
    updateSelectedProducts();
    updateProductGrid();
  }

  /* Update the Selected Products section */
  function updateSelectedProducts() {
    const selectedProductsList = document.getElementById(
      "selectedProductsList"
    );
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
        <div class="selected-product-item" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" />
          <div>
            <h4>${product.name}</h4>
            <button class="remove-btn">Remove</button>
          </div>
        </div>
      `
      )
      .join("");

    // Add event listeners to remove buttons
    const removeButtons = selectedProductsList.querySelectorAll(".remove-btn");
    removeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const productId = e.target.closest(".selected-product-item").dataset.id;
        selectedProducts = selectedProducts.filter((p) => p.id !== productId);
        saveSelectedProductsToLocalStorage();
        updateSelectedProducts();
        updateProductGrid();
      });
    });
  }

  /* Update product grid to visually mark selected products */
  function updateProductGrid() {
    const productCards = productsContainer.querySelectorAll(".product-card");
    productCards.forEach((card) => {
      const productId = card.dataset.id;
      if (selectedProducts.some((p) => p.id === productId)) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
  }

  /* Create HTML for displaying product cards */
  function displayProducts(products) {
    if (products.length === 0) {
      productsContainer.innerHTML = `<div class="no-results">No products found in this category.</div>`;
      return;
    }
    productsContainer.innerHTML = products
      .map(
        (product) => `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
        <div class="description-overlay">${product.description}</div>
      </div>
    `
      )
      .join("");

    updateProductGrid();
  }

  /* Filter and display products when category changes */
  categoryFilter.addEventListener("change", async (e) => {
    await loadProducts();
    currentCategory = categoryFilter.value;
    filterAndDisplayProducts();
  });

  const defaultSystemMessage = {
    role: "system",
    content: `You are a professional but friendly Loreal expert and advocate. You guide the user to L'Oreal products, beauty routines and recommendations.\n\nIf a user's query is unrelated to L'Oreal products, L'Oreal routines and L'Oreal recommendations, respond by stating that you do not know. Give links to relevant L'Oreal websites if applicable. L'Oreal may be spelled Loreal, L'Oréal among others.`,
  };

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    currentSearchTerm = e.target.value.toLowerCase();
    filterAndDisplayProducts();
  });

  function filterAndDisplayProducts() {
    const filtered = allProducts.filter((product) => {
      const matchesCategory =
        !currentCategory || product.category === currentCategory;
      const matchesSearch =
        !currentSearchTerm ||
        product.name.toLowerCase().includes(currentSearchTerm) ||
        product.description.toLowerCase().includes(currentSearchTerm);
      return matchesCategory && matchesSearch;
    });

    displayProducts(filtered);
  }

  let messages = [defaultSystemMessage];

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
        addMessageToChat(
          msg.role === "user" ? "user" : "assistant",
          msg.content
        );
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
    setTimeout(() => {
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }, 10);
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
    saveMessagesToLocalStorage();

    // Add 'Thinking...' animation
    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "assistant-message";
    thinkingDiv.id = "thinking-message";
    thinkingDiv.innerHTML =
      '<strong>Smart Product Advisor:</strong> <span class="thinking-dots">Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    chatbotMessages.appendChild(thinkingDiv);
    setTimeout(() => {
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }, 10);

    // Prepare the API request for the Cloudflare Worker
    const apiUrl = workerUrl; // Use the workerUrl instead of OpenAI endpoint
    const headers = {
      "Content-Type": "application/json",
    };
    const body = {
      model: "gpt-4o-search-preview",
      messages: messages, // Send the full conversation history
      temperature: 0.8, // Make the assistant more creative
      max_tokens: 300, // Keep responses short and focused
      web_search: true, // Enable web search functionality
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
        saveMessagesToLocalStorage();
        console.error("No valid assistant reply in response:", data);
        return;
      }

      // Add the assistant's reply to the messages array
      messages.push({ role: "assistant", content: assistantReply });
      renderMessages();
      saveMessagesToLocalStorage();
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
      saveMessagesToLocalStorage();
      console.error("API error:", error);
    }
  }

  function saveMessagesToLocalStorage() {
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    localStorage.setItem("chatHistory", JSON.stringify(nonSystemMessages));
  }

  const storedMessages = localStorage.getItem("chatHistory");
  if (storedMessages) {
    try {
      const parsed = JSON.parse(storedMessages);
      if (Array.isArray(parsed)) {
        messages = [
          defaultSystemMessage,
          ...parsed.filter((m) => m.role !== "system"),
        ];
        renderMessages();
      }
    } catch (e) {
      console.warn("Failed to load chat history from localStorage", e);
    }
  }

  function clearChatHistory() {
    localStorage.removeItem("chatHistory");
    messages = [defaultSystemMessage];
    renderMessages();
  }

  // Initial render
  renderMessages();

  /* Handle product card click */
  productsContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    const productName = card.querySelector("h3").textContent;
    const productImage = card.querySelector("img").src;

    const existingProduct = selectedProducts.find((p) => p.id === productId);
    if (existingProduct) {
      // Unselect product
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
    } else {
      // Select product
      selectedProducts.push({
        id: productId,
        name: productName,
        image: productImage,
      });
    }

    saveSelectedProductsToLocalStorage();
    updateSelectedProducts();
    updateProductGrid();
  });

  /* Load selected products on page load */
  loadSelectedProductsFromLocalStorage();

  /* Update system message after routine generation */
  const updateSystemMessageForRoutine = (routine) => {
    messages[0] = {
      role: "system",
      content: `You are a beauty expert. You have generated the following routine: \n${routine}\n\nYou can now answer follow-up questions related to this routine or topics like skincare, haircare, makeup, fragrance, and other beauty-related areas.`,
    };
  };

  /* Handle Generate Routine button click */
  const generateRoutineButton = document.getElementById("generateRoutine");
  if (generateRoutineButton) {
    generateRoutineButton.addEventListener("click", async () => {
      if (selectedProducts.length === 0) {
        addMessageToChat(
          "assistant",
          "Please select some products to generate a routine."
        );
        return;
      }

      // Add 'Thinking...' animation
      const thinkingDiv = document.createElement("div");
      thinkingDiv.className = "assistant-message";
      thinkingDiv.id = "thinking-message";
      thinkingDiv.innerHTML =
        '<strong>Smart Product Advisor:</strong> <span class="thinking-dots">Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
      chatbotMessages.appendChild(thinkingDiv);
      setTimeout(() => {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
      }, 10);

      // Prepare data for OpenAI API
      const productData = selectedProducts.map((product) => ({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
      }));

      const apiUrl = workerUrl; // Use the workerUrl for OpenAI API
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        model: "gpt-4o-search-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a beauty expert creating personalized routines based on selected products.",
          },
          {
            role: "user",
            content: `Generate a routine using these products: ${JSON.stringify(
              productData
            )}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      };

      try {
        // Send request to OpenAI API
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        // Remove 'Thinking...' animation
        const thinkingMsg = document.getElementById("thinking-message");
        if (thinkingMsg) thinkingMsg.remove();

        const routine =
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content;

        if (routine) {
          addMessageToChat("assistant", routine);
          updateSystemMessageForRoutine(routine);
        } else {
          addMessageToChat(
            "assistant",
            "Sorry, I couldn't generate a routine. Please try again."
          );
        }
      } catch (error) {
        console.error("Error generating routine:", error);
        // Remove 'Thinking...' animation
        const thinkingMsg = document.getElementById("thinking-message");
        if (thinkingMsg) thinkingMsg.remove();
        addMessageToChat(
          "assistant",
          "There was an error generating your routine. Please try again later."
        );
      }
    });
  }
});
