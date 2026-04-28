const fetch = (await import('node-fetch')).default;
const BASE = 'http://localhost:5000/api';

async function login(email, pass) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password: pass})
  });
  const data = await res.json();
  return data.token;
}

async function getDisasters(token) {
  const res = await fetch(`${BASE}/disasters`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return await res.json();
}

async function getBudget(token) {
  const res = await fetch(`${BASE}/budget/current`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return await res.json();
}

async function createBudget(token) {
  const res = await fetch(`${BASE}/budget/create`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    body: JSON.stringify({fiscalYear: 2026, allocatedBudget: 100000000})
  });
  return await res.json();
}

async function allocate(token, disasterId, amount) {
  const res = await fetch(`${BASE}/request`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
    body: JSON.stringify({
      incidentId: disasterId,
      requestedAmount: amount,
      category: 'Aid Allocation',
      urgency: 'Normal',
      householdId: 'TEST001'
    })
  });
  return await res.json();
}

async function getAuditLogs(token) {
  const res = await fetch(`${BASE}/financial/auditlogs`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return await res.json();
}

(async () => {
  console.log('Test full flow...');
  const token = await login('finance@dmis.com', 'finance123');
  console.log('Token:', token?.slice(0,20) + '...');
  
  const disasters = await getDisasters(token);
  const disasterId = disasters[0]?._id;
  console.log('Disaster ID:', disasterId);
  
  let budget = await getBudget(token);
  if (!budget) {
    budget = await createBudget(token);
    console.log('Created budget:', budget);
  }
  
  const allocRes = await allocate(token, disasterId, 50000);
  console.log('Allocation:', allocRes);
  
  const audits = await getAuditLogs(token);
  console.log('Audit logs count:', audits.length);
  console.log('Recent audit:', audits[0]);
  
  console.log('Test complete!');
})();

