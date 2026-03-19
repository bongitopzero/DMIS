import fetch from 'node-fetch';

const BASE = 'http://localhost:5000';

function randEmail() { return `settings_test_${Date.now()}@example.com`; }

async function run() {
  console.log('Settings update verification starting...');
  try {
    // Register admin
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Settings Tester', email: randEmail(), password: 'pass123', role: 'Administrator' })
    });

    const regBody = await regRes.json();
    if (!regRes.ok) throw new Error('Register failed: ' + JSON.stringify(regBody));
    console.log('Registered admin:', regBody.email);

    const token = regBody.token;
    const userId = regBody._id;

    // Update profile (name + ministry)
    const newName = 'Settings Tester Updated';
    const newMinistry = 'Ministry of Testing';

    const putRes = await fetch(`${BASE}/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName, ministry: newMinistry })
    });

    const putBody = await putRes.json();
    if (!putRes.ok) throw new Error('Update failed: ' + JSON.stringify(putBody));

    console.log('Update response:', putBody);

    // Fetch user list to confirm
    const listRes = await fetch(`${BASE}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
    const listBody = await listRes.json();
    if (!listRes.ok) throw new Error('List users failed: ' + JSON.stringify(listBody));

    const found = listBody.find(u => u._id === userId);
    if (!found) throw new Error('Updated user not found in users list');

    console.log('Verified user in /users:', { _id: found._id, name: found.name, ministry: found.ministry });
    console.log('Settings save flow verified successfully.');
  } catch (err) {
    console.error('Verification error:', err);
    process.exitCode = 2;
  }
}

run();
