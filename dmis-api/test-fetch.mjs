import fetch from 'node-fetch';

const res = await fetch('http://localhost:5000/api/allocation/approve-ineligible-disaster', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ disasterId: '000000000000000000000000' }),
});

console.log('status', res.status);
console.log(await res.text());
