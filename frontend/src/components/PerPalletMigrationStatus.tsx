import React, { useState } from 'react';
import { MIGRATION_PALLETS } from '../constants/migrationPallets';
import './PerPalletMigrationStatus.css';

const PALLETS_PER_PAGE = 6;

const PerPalletMigrationStatus: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  
  const totalPages = Math.ceil(MIGRATION_PALLETS.length / PALLETS_PER_PAGE);
  const startIndex = currentPage * PALLETS_PER_PAGE;
  const endIndex = startIndex + PALLETS_PER_PAGE;
  const visiblePallets = MIGRATION_PALLETS.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <section className="card pallet-status">
      <div className="card-header">
        <h2 className="card-title">Per-Pallet Migration Status</h2>
        <div className="card-actions">
          <div className="search-box">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            <input type="text" className="search-input" placeholder="Search pallets..." />
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Pallet Name</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Items Processed</th>
              <th>Time in Stage</th>
            </tr>
          </thead>
          <tbody>
            {visiblePallets.map((pallet) => (
              <tr key={pallet}>
                <td>{pallet}</td>
                <td><span className="badge badge-pending">Pending</span></td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                </td>
                <td>0 / 0</td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn" 
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Previous
          </button>
          <span className="pagination-info">
            {startIndex + 1}-{Math.min(endIndex, MIGRATION_PALLETS.length)} of {MIGRATION_PALLETS.length} pallets
          </span>
          <button 
            className="pagination-btn" 
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </section>
  );
};

export default PerPalletMigrationStatus; 