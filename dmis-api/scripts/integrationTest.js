#!/usr/bin/env node
/* Integration smoke test: create admin, create incident, verify incident -> check disaster creation
   Usage: node integrationTest.js
*/
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API = `http://localhost:${process.env.PORT||5000}/api`;

async function register(name, email, password, role) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });
  return res.json();
}

async function postIncident(token, payload) {
  const res = await fetch(`${API}/incidents`, {
    method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function verifyIncident(token, id) {
  const res = await fetch(`${API}/incidents/${id}/verify`, {
    method: 'PUT', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
    body: JSON.stringify({ verifiedStatus: 'verified' })
  });
  return res.json();
}

async function listDisasters(token) {
  const res = await fetch(`${API}/disasters`, { headers: { 'Authorization':'Bearer '+token } });
  return res.json();
}

async function run() {
  console.log('Integration smoke test starting...');
  const adminEmail = `smoke_admin_${Date.now()}@example.com`;
  const clerkEmail = `smoke_clerk_${Date.now()}@example.com`;

  console.log('Registering admin user...');
  const admin = await register('Smoke Admin', adminEmail, 'pass123', 'Administrator');
  if (!admin.token) return console.error('Admin registration failed', admin);
  console.log('Admin token acquired.');

  console.log('Registering data clerk...');
  const clerk = await register('Smoke Clerk', clerkEmail, 'pass123', 'Data Clerk');
  if (!clerk.token) return console.error('Clerk registration failed', clerk);

  console.log('Creating incident as Data Clerk...');
  // Use randomized fields to avoid duplicate-key collisions when running repeatedly
  const households = Math.floor(Math.random() * 50) + 1;
  const severity = Math.floor(Math.random() * 10) + 1;
  const incident = await postIncident(clerk.token, { disasterType: `drought`, district: 'maseru', householdsAffected: households, severityIndex: severity });
  if (!incident._id) return console.error('Failed to create incident', incident);
  console.log('Incident created:', incident._id);

  console.log('Verifying incident as Admin (promote to disaster)...');
  const verified = await verifyIncident(admin.token, incident._id);
  console.log('Verify result:', verified);

  console.log('Listing disasters (admin):');
  const disasters = await listDisasters(admin.token);
  console.log('Disasters count:', Array.isArray(disasters) ? disasters.length : Object.keys(disasters||{}).length);

  console.log('Integration test completed.');
}

run().catch(e=>{console.error('Integration test error', e); process.exit(1);});
