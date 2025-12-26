import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Declaration {
    id: string;
    person: { firstName: string; lastName: string; party?: string; region?: string };
    year: number;
    totalIncome: string;
    totalDeposits: string;
    totalInvestments: string;
    realEstateCount: number;
    vehicleCount: number;
}

export default function Dashboard() {
    const [data, setData] = useState<Declaration[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [partyFilter, setPartyFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');

    useEffect(() => {
        fetch('http://localhost:3000/api/declarations')
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={{padding: '2rem'}}>Loading Data...</div>;

    const topEarners = [...data].sort((a,b) => parseFloat(b.totalIncome) - parseFloat(a.totalIncome)).slice(0, 10).map(d => ({
        name: d.person.lastName,
        income: parseFloat(d.totalIncome)
    }));

    const totalIncome = data.reduce((acc, curr) => acc + parseFloat(curr.totalIncome), 0);
    const totalDeposits = data.reduce((acc, curr) => acc + parseFloat(curr.totalDeposits), 0);
    const totalInvestments = data.reduce((acc, curr) => acc + parseFloat(curr.totalInvestments), 0);
    
    // Extract unique options for filters
    const uniqueParties = Array.from(new Set(data.map(d => d.person.party).filter(Boolean))).sort();
    const uniqueRegions = Array.from(new Set(data.map(d => d.person.region).filter(Boolean))).sort();

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = data.filter(d => {
        const matchesParty = partyFilter ? d.person.party === partyFilter : true;
        const matchesRegion = regionFilter ? d.person.region === regionFilter : true;
        return matchesParty && matchesRegion;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        
        let aValue: any, bValue: any;

        switch (key) {
            case 'name':
                aValue = a.person.lastName + a.person.firstName;
                bValue = b.person.lastName + b.person.firstName;
                break;
            case 'party':
                aValue = a.person.party || '';
                bValue = b.person.party || '';
                break;
            case 'region':
                aValue = a.person.region || '';
                bValue = b.person.region || '';
                break;
            case 'income':
                aValue = parseFloat(a.totalIncome);
                bValue = parseFloat(b.totalIncome);
                break;
            case 'deposits':
                aValue = parseFloat(a.totalDeposits);
                bValue = parseFloat(b.totalDeposits);
                break;
            case 'investments':
                aValue = parseFloat(a.totalInvestments);
                bValue = parseFloat(b.totalInvestments);
                break;
             case 'realEstate':
                aValue = a.realEstateCount;
                bValue = b.realEstateCount;
                break;
             default:
                return 0;
        }
        
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} style={{marginLeft: 4, opacity: 0.5}} />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} style={{marginLeft: 4}} /> 
            : <ArrowDown size={14} style={{marginLeft: 4}} />;
    };

    return (
        <div>
            <div className="card-grid">
                <div className="card">
                    <div className="stat-label">Total Declared Income</div>
                    <div className="stat-value">€{totalIncome.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                <div className="card">
                    <div className="stat-label">Total Deposits</div>
                    <div className="stat-value">€{totalDeposits.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                 <div className="card">
                    <div className="stat-label">Investments Total</div>
                    <div className="stat-value">€{totalInvestments.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Top 10 MPs by Annual Income</h2>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEarners} margin={{ bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-25} textAnchor="end" />
                            <YAxis tickFormatter={(val) => `€${val/1000}k`} />
                            <Tooltip formatter={(val: any) => `€${val?.toLocaleString()}`} />
                            <Bar dataKey="income" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <div style={{fontWeight: 600}}>All Declarations</div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <select 
                            value={partyFilter} 
                            onChange={(e) => setPartyFilter(e.target.value)}
                            style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
                        >
                            <option value="">All Parties</option>
                            {uniqueParties.map(p => <option key={p} value={p as string}>{p as string}</option>)}
                        </select>
                        <select 
                            value={regionFilter} 
                            onChange={(e) => setRegionFilter(e.target.value)}
                            style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd'}}
                        >
                            <option value="">All Regions</option>
                            {uniqueRegions.map(r => <option key={r} value={r as string}>{r as string}</option>)}
                        </select>
                    </div>
                </div>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Name {getSortIcon('name')}</div>
                                </th>
                                <th>Role</th>
                                <th onClick={() => handleSort('party')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Party {getSortIcon('party')}</div>
                                </th>
                                <th onClick={() => handleSort('region')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Region {getSortIcon('region')}</div>
                                </th>
                                <th onClick={() => handleSort('income')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Income {getSortIcon('income')}</div>
                                </th>
                                <th onClick={() => handleSort('deposits')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Deposits {getSortIcon('deposits')}</div>
                                </th>
                                <th onClick={() => handleSort('investments')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Investments {getSortIcon('investments')}</div>
                                </th>
                                <th onClick={() => handleSort('realEstate')} style={{cursor: 'pointer'}}>
                                    <div style={{display: 'flex', alignItems: 'center'}}>Real Estate {getSortIcon('realEstate')}</div>
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div style={{fontWeight: 500}}>{d.person.lastName} {d.person.firstName}</div>
                                    </td>
                                    <td>MP</td>
                                    <td>{d.person.party || '-'}</td>
                                    <td>{d.person.region || '-'}</td>
                                    <td className="currency positive">€{parseFloat(d.totalIncome).toLocaleString()}</td>
                                    <td className="currency" style={{color: '#475569'}}>€{parseFloat(d.totalDeposits).toLocaleString()}</td>
                                    <td className="currency" style={{color: '#475569'}}>€{parseFloat(d.totalInvestments).toLocaleString()}</td>
                                    <td>{d.realEstateCount}</td>
                                    <td>
                                        <Link to={`/declaration/${d.id}`} style={{fontWeight: 500}}>View</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
