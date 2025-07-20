document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const tokenInput = document.getElementById('token');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const fetchBtn = document.getElementById('fetchBtn');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    // Load saved username and token on startup
    chrome.storage.local.get(['githubUsername', 'githubToken'], (data) => {
        if (data.githubUsername) {
            usernameInput.value = data.githubUsername;
        }
        if (data.githubToken) {
            tokenInput.setAttribute('placeholder', 'Token is saved');
        }
    });

    // Save the token securely
    saveTokenBtn.addEventListener('click', () => {
        const token = tokenInput.value;
        if (token) {
            chrome.storage.local.set({ githubToken: token }, () => {
                statusDiv.textContent = 'Token saved successfully!';
                statusDiv.style.color = '#2ea44f';
                tokenInput.value = '';
                tokenInput.setAttribute('placeholder', 'Token is saved');
                setTimeout(() => statusDiv.textContent = '', 3000);
            });
        } else {
            statusDiv.textContent = 'Please enter a token.';
            statusDiv.style.color = '#d73a49';
        }
    });

    // Fetch the pull requests
    fetchBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        if (!username) {
            statusDiv.textContent = 'Please enter a GitHub username.';
            statusDiv.style.color = '#d73a49';
            return;
        }

        // Save username for next time
        chrome.storage.local.set({ githubUsername: username });

        const { githubToken } = await chrome.storage.local.get('githubToken');
        if (!githubToken) {
            statusDiv.textContent = 'Please save a Personal Access Token first.';
            statusDiv.style.color = '#d73a49';
            return;
        }

        statusDiv.textContent = 'Fetching...';
        statusDiv.style.color = '#0366d6';
        resultsDiv.innerHTML = '';

        try {
            // Construct the search query
            const query = `is:pr is:open author:${username}`;
            const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API Error: ${response.status} ${errorData.message || ''}`);
            }

            const data = await response.json();
            displayResults(data.items);

        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.style.color = '#d73a49';
            console.error(error);
        }
    });

    function displayResults(prs) {
        if (prs.length === 0) {
            statusDiv.textContent = 'No open pull requests found.';
            statusDiv.style.color = '#586069';
            return;
        }

        statusDiv.textContent = `Found ${prs.length} open pull request(s).`;
        statusDiv.style.color = '#2ea44f';

        prs.forEach(pr => {
            const prItem = document.createElement('div');
            prItem.className = 'pr-item';

            const prTitle = document.createElement('a');
            prTitle.className = 'pr-title';
            prTitle.href = pr.html_url;
            prTitle.textContent = `#${pr.number} - ${pr.title}`;
            prTitle.target = '_blank'; // Open in new tab

            const prRepo = document.createElement('div');
            prRepo.className = 'pr-repo';
            // Extract repo name from the URL
            const repoName = pr.repository_url.split('/').slice(-2).join('/');
            prRepo.textContent = repoName;

            prItem.appendChild(prTitle);
            prItem.appendChild(prRepo);
            resultsDiv.appendChild(prItem);
        });
    }
});
