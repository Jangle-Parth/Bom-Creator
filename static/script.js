document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const fetchInput = document.getElementById('fetchInput');
    const suggestionList = document.getElementById('suggestionList');
    const itemTable = document.getElementById('itemTable');

    // Track which input triggered the suggestions
    let activeInput = null;

    // Style the suggestion list
    suggestionList.style.position = 'absolute';
    suggestionList.style.maxHeight = '200px';
    suggestionList.style.overflowY = 'auto';
    suggestionList.style.width = '100%';
    suggestionList.style.zIndex = '1000';

    // Add input event listeners with debouncing
    searchInput.addEventListener('input', debounce(function(e) {
        activeInput = searchInput;
        updateSuggestions(e.target.value);
    }, 300));

    fetchInput.addEventListener('input', debounce(function(e) {
        activeInput = fetchInput;
        updateSuggestions(e.target.value);
    }, 300));

    // Handle input focus
    searchInput.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            activeInput = searchInput;
            updateSuggestions(this.value);
        }
    });

    fetchInput.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            activeInput = fetchInput;
            updateSuggestions(this.value);
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#searchInput') && 
            !e.target.closest('#fetchInput') && 
            !e.target.closest('#suggestionList')) {
            suggestionList.innerHTML = '';
        }
    });

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function updateSuggestions(query) {
        if (query.length < 2) {
            suggestionList.innerHTML = '';
            return;
        }

        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query }),
        })
        .then(response => response.json())
        .then(data => {
            suggestionList.innerHTML = '';
            
            // Position the suggestion list below the active input
            if (activeInput) {
                const inputRect = activeInput.getBoundingClientRect();
                suggestionList.style.top = `${inputRect.bottom + window.scrollY}px`;
                suggestionList.style.left = `${inputRect.left + window.scrollX}px`;
                suggestionList.style.width = `${inputRect.width}px`;
            }

            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item suggestion-item';
                li.style.cursor = 'pointer';
                
                // Highlight matching text
                const itemText = `${item['Item Code']} - ${item['Item Description']}`;
                const highlightedText = itemText.replace(
                    new RegExp(query, 'gi'),
                    match => `<strong>${match}</strong>`
                );
                li.innerHTML = highlightedText;

                li.addEventListener('click', () => {
                    if (activeInput === searchInput) {
                        addItemToTable(item);
                        searchInput.value = '';
                    } else if (activeInput === fetchInput) {
                        fetchInput.value = item['Item Code'];
                    }
                    suggestionList.innerHTML = '';
                });

                // Hover effect
                li.addEventListener('mouseover', () => {
                    li.style.backgroundColor = '#f0f0f0';
                });
                li.addEventListener('mouseout', () => {
                    li.style.backgroundColor = '';
                });

                suggestionList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
        });
    }

    function addItemToTable(item) {
        const tbody = itemTable.querySelector('tbody');
        const existingRow = Array.from(tbody.rows).find(
            row => row.cells[0].textContent === item['Item Code']
        );

        if (existingRow) {
            // If item exists, increment quantity
            const quantityCell = existingRow.cells[2];
            const currentQty = parseInt(quantityCell.textContent) || 0;
            quantityCell.textContent = currentQty + 1;
            // Highlight the row briefly
            existingRow.style.backgroundColor = '#ffffcc';
            setTimeout(() => {
                existingRow.style.backgroundColor = '';
            }, 1000);
        } else {
            // Add new row
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item['Item Code']}</td>
                <td>${item['Item Description']}</td>
                <td class="editable">1</td>
                <td>${item['Inventory UoM']}</td>
                <td class="editable"></td>
                <td>
                    <button class="btn btn-sm btn-danger delete-btn">Delete</button>
                </td>
            `;

            // Add delete button handler
            row.querySelector('.delete-btn').addEventListener('click', () => {
                row.remove();
            });

            // Make cells editable
            row.querySelectorAll('.editable').forEach(cell => {
                cell.addEventListener('dblclick', function() {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = this.textContent;
                    input.style.width = '100%';
                    
                    input.addEventListener('blur', function() {
                        cell.textContent = this.value;
                    });
                    
                    input.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            cell.textContent = this.value;
                        }
                    });

                    cell.textContent = '';
                    cell.appendChild(input);
                    input.focus();
                });
            });

            // Highlight new row
            row.style.backgroundColor = '#ffffcc';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 1000);
        }
    }
});