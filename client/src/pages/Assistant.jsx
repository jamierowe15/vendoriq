// Chat panel for the AI agent. Shows each answer and the tool calls the agent made.
import { useState } from 'react';
import { api } from '../api.js';

const EXAMPLES = [
  'Which high-risk vendors have contracts expiring in the next 60 days?',
  'Summarize Contoso Payroll: contracts, value and risk.',
  'Compare the bids for the cloud backup RFP and recommend one.',
  'Flag Proseware Telecom for review because no BCP plan was provided.'
];

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  async function ask(q) {
    setBusy(true);
    try {
      const result = await api('/api/agent', { method: 'POST', body: JSON.stringify({ question: q }) });
      setHistory(h => [...h, { q, ...result }]);
    } catch (err) {
      setHistory(h => [...h, { q, answer: `Error: ${err.message}`, steps: [] }]);
    } finally {
      setBusy(false);
      setQuestion('');
    }
  }

  return (
    <section>
      <h2>Ask VendorIQ</h2>
      <div className="examples">
        {EXAMPLES.map(e => <button key={e} className="secondary" onClick={() => ask(e)} disabled={busy}>{e}</button>)}
      </div>
      {history.map((h, i) => (
        <div key={i} className="turn">
          <p><strong>You:</strong> {h.q}</p>
          <p className="answer"><strong>VendorIQ:</strong> {h.answer}</p>
          {h.steps?.length > 0 && (
            <details>
              <summary>{h.steps.length} tool call(s)</summary>
              <ul>{h.steps.map((s, j) => (
                <li key={j}>{s.ok ? '✔' : '✖'} <code>{s.tool}</code> {JSON.stringify(s.args)}</li>
              ))}</ul>
            </details>
          )}
        </div>
      ))}
      <form className="ask" onSubmit={e => { e.preventDefault(); if (question.trim()) ask(question); }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about vendors, contracts, bids or risk" disabled={busy} />
        <button type="submit" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
      </form>
    </section>
  );
}
