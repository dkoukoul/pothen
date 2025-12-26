import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DeclarationDetail() {
    const { id } = useParams();
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/declarations/${id}`)
            .then(res => res.json())
            .then(setDetails);
    }, [id]);

    if (!details) return <div style={{padding: '2rem'}}>Loading...</div>;

    // Group sections
    const incomes = details.sections.filter((s: any) => s.sectionType === 'INCOME');
    // const realEstate = details.sections.filter((s: any) => s.sectionType === 'REAL_ESTATE');
    const deposits = details.sections.filter((s: any) => s.sectionType === 'BANK_ACCOUNT');
    const investments = details.sections.filter((s: any) => s.sectionType === 'SECURITY');

    return (
        <div>
             <Link to="/" style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)'}}>
                <ArrowLeft size={16} /> Back to Dashboard
             </Link>
             
             <div className="header">
                <div>
                     <h1 style={{fontSize: '2rem'}}>{details.person.lastName} {details.person.firstName}</h1>
                     <div style={{color: 'var(--text-muted)'}}>Declaration {details.year} ({details.declarationNumber})</div>
                </div>
             </div>

             <div className="card-grid">
                <div className="card">
                     <div className="stat-label">Income</div>
                     <div className="stat-value">€{parseFloat(details.totalIncome).toLocaleString()}</div>
                </div>
                <div className="card">
                     <div className="stat-label">Deposits</div>
                     <div className="stat-value">€{parseFloat(details.totalDeposits).toLocaleString()}</div>
                </div>
                <div className="card">
                     <div className="stat-label">Investments</div>
                     <div className="stat-value">€{parseFloat(details.totalInvestments).toLocaleString()}</div>
                </div>
                <div className="card">
                     <div className="stat-label">Real Estate Count</div>
                     <div className="stat-value">{details.realEstateCount}</div>
                </div>
             </div>

             <h2 style={{marginTop: '2rem', marginBottom: '1rem'}}>Income Sources</h2>
             <div className="data-table-container">
                <table className="data-table">
                    <thead><tr><th>Source</th><th>Amount</th><th>Original Currency</th></tr></thead>
                    <tbody>
                        {incomes.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center', color: '#888'}}>No records</td></tr>}
                        {incomes.map((inc: any) => (
                            <tr key={inc.id}>
                                <td>{inc.data.description || 'Income'}</td>
                                <td className="currency">€{parseFloat(inc.amount).toLocaleString()}</td>
                                <td>{inc.currency}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>

             <h2 style={{marginTop: '2rem', marginBottom: '1rem'}}>Bank Deposits</h2>
             <div className="data-table-container">
                 <table className="data-table">
                     <thead><tr><th>Details</th><th>Amount</th><th>Currency</th></tr></thead>
                     <tbody>
                        {deposits.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center', color: '#888'}}>No records</td></tr>}
                         {deposits.map((dep: any) => (
                             <tr key={dep.id}>
                                 <td>{dep.data.raw || 'Bank Account'}</td>
                                 <td className="currency">{parseFloat(dep.amount).toLocaleString()}</td>
                                 <td>{dep.currency}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>

             <h2 style={{marginTop: '2rem', marginBottom: '1rem'}}>Investments & Securities</h2>
             <div className="data-table-container">
                 <table className="data-table">
                     <thead><tr><th>Description</th><th>Acquisition</th><th>Valuation</th><th>Sold</th></tr></thead>
                     <tbody>
                        {investments.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', color: '#888'}}>No records</td></tr>}
                         {investments.map((inv: any) => (
                             <tr key={inv.id}>
                                 <td>{inv.data.raw || 'Security'}</td>
                                 <td>{inv.data.acquisition}</td>
                                 <td className="currency positive">{inv.data.valuation}</td>
                                 <td>{inv.data.sold}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    )
}
