// DOM Elements
const searchSection = document.querySelector("#searchSection") as HTMLElement | null;
const resultsSection = document.querySelector("#resultsSection") as HTMLElement | null;
const poemSection = document.querySelector("#poemSection") as HTMLElement | null;
const authorTableDiv = document.querySelector("#authorTableDiv") as HTMLElement | null;
const linesTextDiv = document.querySelector("#linesTextDiv") as HTMLElement | null;
const linesHeader = document.querySelector("#linesHeader") as HTMLElement | null;
const linesText = document.querySelector("#linesText") as HTMLElement | null;
const loadingOverlay = document.querySelector("#loadingOverlay") as HTMLElement | null;
const errorContainer = document.querySelector("#errorContainer") as HTMLElement | null;
const submitBtn = document.querySelector("#submitBtn") as HTMLButtonElement | null;
const resultsTitle = document.querySelector("#resultsTitle") as HTMLElement | null;
const resultsCount = document.querySelector("#resultsCount") as HTMLElement | null;

// Event Listeners
const backBtn = document.querySelector("#backBtn");
if (backBtn) {
  backBtn.addEventListener("click", backToGrid);
}

const favoriteBtn = document.querySelector("#favoriteBtn");
if (favoriteBtn) {
  favoriteBtn.addEventListener("click", toggleFavorite);
}

const form = document.querySelector("#searchForm") as HTMLFormElement | null;
if (form) {
  form.addEventListener("submit", generateGrid);
}

// Initialize UI state
initializeUI();

function initializeUI(): void {
  if (resultsSection) resultsSection.classList.remove("visible");
  if (poemSection) poemSection.classList.remove("visible");
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

// Loading and Error Management
function showLoading(message: string = "Searching for poetry..."): void {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("hidden");
    const loadingText = loadingOverlay.querySelector("p");
    if (loadingText) loadingText.textContent = message;
  }
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
  }
}

function hideLoading(): void {
  if (loadingOverlay) {
    loadingOverlay.classList.add("hidden");
  }
  
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
}

function showError(message: string): void {
  if (!errorContainer) return;
  
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  
  errorContainer.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorContainer.contains(errorDiv)) {
      errorContainer.removeChild(errorDiv);
    }
  }, 5000);
}

function clearErrors(): void {
  if (errorContainer) {
    errorContainer.innerHTML = "";
  }
}

// Favorites Management
let favorites: PoemData[] = JSON.parse(localStorage.getItem("poetryFavorites") || "[]");
let currentPoem: PoemData | null = null;

function saveFavorites(): void {
  localStorage.setItem("poetryFavorites", JSON.stringify(favorites));
}

function toggleFavorite(): void {
  if (!currentPoem || !favoriteBtn) return;
  
  const isFavorited = favorites.some(fav => 
    fav.title === currentPoem!.title && fav.author === currentPoem!.author
  );
  
  if (isFavorited) {
    favorites = favorites.filter(fav => 
      !(fav.title === currentPoem!.title && fav.author === currentPoem!.author)
    );
    favoriteBtn.classList.remove("favorited");
    favoriteBtn.querySelector(".heart-icon")!.textContent = "♡";
    favoriteBtn.setAttribute("aria-label", "Add to favorites");
  } else {
    favorites.push(currentPoem);
    favoriteBtn.classList.add("favorited");
    favoriteBtn.querySelector(".heart-icon")!.textContent = "♥";
    favoriteBtn.setAttribute("aria-label", "Remove from favorites");
  }
  
  saveFavorites();
}

type PoemData = {
  title: string;
  author: string;
  lines: string[];
};

function generateGrid(e: Event): void {
  e.preventDefault();
  
  const authorNameInput = document.querySelector("#authorName") as HTMLInputElement | null;
  const titleInput = document.querySelector("#poemTitle") as HTMLInputElement | null;

  if (!authorNameInput || !titleInput) {
    showError("Form inputs not found");
    return;
  }

  const authorValue = authorNameInput.value.trim();
  const titleValue = titleInput.value.trim();

  if (!validateInput(authorValue, titleValue)) {
    return;
  }

  clearErrors();
  showLoading();

  // Hide results section initially
  if (resultsSection) resultsSection.classList.remove("visible");
  if (poemSection) poemSection.classList.remove("visible");

  if (authorValue !== "" && titleValue === "") {
    getAuthor(authorValue);
  } else if (authorValue !== "" && titleValue !== "") {
    getPoemByAuthorAndTitle(authorValue, titleValue);
  } else if (authorValue === "" && titleValue !== "") {
    getPoemByTitle(titleValue);
  }
}

function backToGrid(): void {
  if (resultsSection) resultsSection.classList.add("visible");
  if (poemSection) poemSection.classList.remove("visible");
  currentPoem = null;
}

async function getAuthor(author: string): Promise<void> {
  try {
    const encodedAuthor = encodeURIComponent(author.trim());
    const response = await fetch(`https://poetrydb.org/author/${encodedAuthor}`);
    
    if (!response.ok) {
      hideLoading();
      if (response.status === 404) {
        showError(`No poems found by author "${author}"`);
        return;
      }
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data: PoemData[] = await response.json();
    
    // Check if the API returned an error message instead of poem data
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as any;
      if ('status' in firstItem && firstItem.status === 'Not found') {
        hideLoading();
        showError(`No poems found by author "${author}"`);
        return;
      }
    }
    
    hideLoading();
    renderGrid(data, `Poems by ${author}`);
    
  } catch (error) {
    hideLoading();
    console.error("Error fetching author data:", error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError("Network error: Please check your internet connection");
    } else {
      showError("Failed to fetch author data. Please try again.");
    }
  }
}

async function getPoemByTitle(title: string): Promise<void> {
  try {
    const encodedTitle = encodeURIComponent(title.trim());
    const response = await fetch(`https://poetrydb.org/title/${encodedTitle}`);
    
    if (!response.ok) {
      hideLoading();
      if (response.status === 404) {
        showError(`No poems found with title "${title}"`);
        return;
      }
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data: PoemData[] = await response.json();
    
    // Check if the API returned an error message instead of poem data
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as any;
      if ('status' in firstItem && firstItem.status === 'Not found') {
        hideLoading();
        showError(`No poems found with title "${title}"`);
        return;
      }
    }
    
    hideLoading();
    renderGrid(data, `Poems titled "${title}"`);
    
  } catch (error) {
    hideLoading();
    console.error("Error fetching poem by title:", error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError("Network error: Please check your internet connection");
    } else {
      showError("Failed to fetch poem data. Please try again.");
    }
  }
}

async function getPoemByAuthorAndTitle(author: string, title: string): Promise<void> {
  try {
    // URL encode the parameters to handle special characters and spaces
    const encodedAuthor = encodeURIComponent(author.trim());
    const encodedTitle = encodeURIComponent(title.trim());
    
    const response = await fetch(`https://poetrydb.org/author,title/${encodedAuthor};${encodedTitle}`);
    
    if (!response.ok) {
      hideLoading();
      if (response.status === 404) {
        showError(`No poems found for "${author}" with title "${title}"`);
        return;
      }
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data: PoemData[] = await response.json();
    
    // Check if the API returned an error message instead of poem data
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as any;
      if ('status' in firstItem && firstItem.status === 'Not found') {
        hideLoading();
        showError(`No poems found for "${author}" with title "${title}"`);
        return;
      }
    }
    
    hideLoading();
    renderGrid(data, `"${title}" by ${author}`);
    
  } catch (error) {
    hideLoading();
    console.error("Error fetching poem by author and title:", error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError("Network error: Please check your internet connection");
    } else {
      showError("Failed to fetch poem data. Please try again.");
    }
  }
}

function renderGrid(poems: PoemData[], title: string = "Search Results"): void {
  const tableBody = document.querySelector('#tableBody') as HTMLTableSectionElement | null;
  
  if (!tableBody) {
    console.error('Table body element not found');
    return;
  }

  // Clear existing content
  tableBody.innerHTML = '';

  // Handle empty results
  if (!poems || poems.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 2;
    emptyCell.textContent = 'No poems found';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.fontStyle = 'italic';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }

  // Create document fragment for better performance
  const fragment = document.createDocumentFragment();

  poems.forEach((poem, index) => {
    const row = document.createElement('tr');
    row.setAttribute('data-poem-index', index.toString());

    // Author cell
    const authorCell = document.createElement('td');
    authorCell.textContent = poem.author || 'Unknown Author';
    authorCell.className = 'author-cell';
    row.appendChild(authorCell);

    // Title cell with click handler
    const titleCell = document.createElement('td');
    titleCell.className = 'title-cell';
    
    const titleDiv = document.createElement('div');
    titleDiv.textContent = poem.title || 'Untitled';
    titleDiv.className = 'title-link';
    titleDiv.style.cursor = 'pointer';
    titleDiv.style.color = '#0066cc';
    titleDiv.style.textDecoration = 'underline';
    
    titleDiv.addEventListener('click', () => {
      showLineText(poem.lines, poem.title, poem.author);
    });

    // Add hover effects
    titleDiv.addEventListener('mouseenter', () => {
      titleDiv.style.color = '#010913ff';
    });
    
    titleDiv.addEventListener('mouseleave', () => {
      titleDiv.style.color = '#0066cc';
    });

    titleCell.appendChild(titleDiv);
    row.appendChild(titleCell);

    fragment.appendChild(row);
  });

  // Append all rows at once for better performance
  tableBody.appendChild(fragment);

  // Update results info
  if (resultsTitle) resultsTitle.textContent = title;
  if (resultsCount) resultsCount.textContent = `${poems.length} poem${poems.length !== 1 ? 's' : ''} found`;

  // Show the results section
  if (resultsSection) resultsSection.classList.add("visible");
}

function showLineText(lines: string[], title: string, author: string): void {
  if (!linesText || !linesHeader || !resultsSection || !poemSection) {
    return;
  }

  // Set current poem for favorites
  currentPoem = { title, author, lines };

  // Update favorite button state
  if (favoriteBtn) {
    const isFavorited = favorites.some(fav => 
      fav.title === title && fav.author === author
    );
    
    if (isFavorited) {
      favoriteBtn.classList.add("favorited");
      favoriteBtn.querySelector(".heart-icon")!.textContent = "♥";
      favoriteBtn.setAttribute("aria-label", "Remove from favorites");
    } else {
      favoriteBtn.classList.remove("favorited");
      favoriteBtn.querySelector(".heart-icon")!.textContent = "♡";
      favoriteBtn.setAttribute("aria-label", "Add to favorites");
    }
  }

  // Clear previous content
  linesText.innerHTML = "";
  
  // Hide results, show poem
  resultsSection.classList.remove("visible");
  poemSection.classList.add("visible");
  
  // Set poem title and author
  linesHeader.innerHTML = `${title}<br><small>by ${author}</small>`;

  // Create poem content
  const ul = document.createElement('ul');
  const listItems = lines.map(line => {
    const li = document.createElement('li');
    li.className = "listItem";
    li.textContent = line || ""; // Handle empty lines
    return li;
  });

  listItems.forEach(li => {
    ul.appendChild(li);
  });

  linesText.appendChild(ul);
}

function validateInput(author: string, title: string): boolean {
  if (author === "" && title === "") {
    showError("Please enter either an author name, poem title, or both");
    return false;
  }
  
  // Allow numbers in titles (many poems have numbers)
  // Only restrict numbers in author names
  if (author && !/^[\p{L}\s\-'.]+$/u.test(author)) {
    showError("Author name should only contain letters, spaces, hyphens, and apostrophes");
    return false;
  }
  
  // Basic validation for title - allow more characters including numbers
  if (title && title.length > 200) {
    showError("Poem title is too long (maximum 200 characters)");
    return false;
  }
  
  return true;
}
