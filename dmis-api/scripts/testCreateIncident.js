(async ()=>{
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YThlMTY4YTI3NmUwOGU4NzU2ZWRiZCIsImlhdCI6MTc3MjY3NTQzMiwiZXhwIjoxNzczMjgwMjMyfQ.DMyrWqF4FQ40qeqS_26uWGnlxBXzwPanTEJNsNraz5g';
  const res = await fetch('http://localhost:5000/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+token },
    body: JSON.stringify({ disasterType: 'drought', district: "Maseru", householdsAffected: 12, severityIndex: 7 })
  });
  const text = await res.text();
  console.log('Status', res.status);
  console.log(text);
})();