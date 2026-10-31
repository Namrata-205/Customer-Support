const input = document.getElementById('questionInput');
const sendButton = document.getElementById('sendBtn');
const messages = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const scroll = document.getElementById('chatScroll');
let busy = false;
let controller = null;
let generation = 0;

function scrollDown() { requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; }); }
function el(tag, cls, content) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (content !== undefined) node.textContent = content; // no HTML injection
  return node;
}
function addMessage(kind, content, sources = [], meta = '') {
  const wrapper = el('article', `message ${kind}`);
  const icon = el('div', 'message-icon', kind === 'user' ? 'Y' : '✳');
  const body = el('div', 'message-body');
  body.appendChild(el('div', 'bubble', content));
  if (sources.length) {
    const tags = el('div', 'source-tags');
    sources.forEach(source => tags.appendChild(el('span', 'source-tag', `↗ ${source}`)));
    body.appendChild(tags);
  }
  if (meta) body.appendChild(el('div', 'meta', meta));
  wrapper.append(icon, body);
  messages.appendChild(wrapper);
  scrollDown();
  return wrapper;
}
function loadingMessage() {
  const wrapper = addMessage('assistant', '');
  const bubble = wrapper.querySelector('.bubble');
  bubble.textContent = '';
  const dots = el('div', 'typing');
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement('i'));
  bubble.appendChild(dots);
  return wrapper;
}
async function ask(question) {
  question = question.trim();
  if (!question || busy) return;
  if (question.length > 1000) { addMessage('assistant', 'Please keep your question under 1,000 characters.'); return; }
  busy = true;
  const requestGeneration = generation;
  controller = new AbortController();
  sendButton.disabled = true;
  welcome.hidden = true;
  input.value = '';
  input.style.height = 'auto';
  addMessage('user', question);
  const pending = loadingMessage();
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({question}),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.');
    if (generation !== requestGeneration) return;
    pending.remove();
    addMessage('assistant', data.answer, data.sources || [], `✦ Answered in ${(data.response_time_ms / 1000).toFixed(2)}s · ${data.response_mode === 'faq_reference' ? 'FAQ reference ? AI unavailable' : 'Knowledge base grounded'}`);
  } catch (error) {
    if (generation !== requestGeneration) return;
    pending.remove();
    if (error.name !== 'AbortError') addMessage('assistant', error.message || 'Unable to connect to the support service. Please try again.');
  } finally {
    if (generation === requestGeneration) { busy = false; sendButton.disabled = false; controller = null; input.focus(); }
  }
}
function reset() {
  generation++;
  if (controller) controller.abort();
  controller = null;
  busy = false;
  sendButton.disabled = false;
  messages.replaceChildren();
  welcome.hidden = false;
  input.value = '';
  input.focus();
  scrollDown();
}
sendButton.addEventListener('click', () => ask(input.value));
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
});
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; });
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.question)));
document.getElementById('newChat').addEventListener('click', reset);
document.getElementById('resetBtn').addEventListener('click', reset);
document.getElementById('helpNav').addEventListener('click', () => { reset(); input.focus(); });
