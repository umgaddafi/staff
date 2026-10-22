import React from 'react';

const tone = {
  'Not Submitted': 'gray',
  Pending: 'gold',
  Uploaded: 'green',
  Verified: 'green',
  Rejected: 'red',
  'Requires Correction': 'amber',
  active: 'green',
  inactive: 'gray',
};

export default function Badge({ children }) {
  return <span className={`badge badge-${tone[children] || 'gray'}`}>{children}</span>;
}
