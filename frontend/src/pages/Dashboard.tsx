import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Declaration {
    id: string;
    person: { firstName: string; lastName: string };
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
                            <Tooltip formatter={(val: number) => `€${val.toLocaleString()}`} />
                            <Bar dataKey="income" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{padding: '0 0 1rem 0', fontWeight: 600}}>All Declarations</div>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Income</th>
                                <th>Deposits</th>
                                <th>Investments</th>
                                <th>Real Estate</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div style={{fontWeight: 500}}>{d.person.lastName} {d.person.firstName}</div>
                                    </td>
                                    <td>MP</td>
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
