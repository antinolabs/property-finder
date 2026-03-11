import React, { useState } from 'react';
import {
    FileText,
    BookOpen,
    Grid,
    Play,
    Plus,
    LayoutDashboard,
    Download,
    Search,
    Pencil,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const pages = [
    { id: 'extract', name: 'Extract Actions', icon: FileText },
    { id: 'preread', name: 'Pre Read', icon: BookOpen },
    { id: 'sheets', name: 'Update Google Sheets', icon: Grid },
];

export default function App() {
    const [activePage, setActivePage] = useState('extract');
    // Per-page loading and status state
    const [pageLoading, setPageLoading] = useState({});
    const [pageStatus, setPageStatus] = useState({});
    const [fetchedData, setFetchedData] = useState(null);
    const [fetchedSection, setFetchedSection] = useState(null);

    // Helpers to get/set per-page state
    const isLoading = (pageId) => !!pageLoading[pageId];
    const getStatus = (pageId) => pageStatus[pageId] || { type: '', message: '' };
    const setStatus = (pageId, status) => setPageStatus(prev => ({ ...prev, [pageId]: status }));
    const setLoading = (pageId, val) => setPageLoading(prev => ({ ...prev, [pageId]: val }));

    // Form States
    const [formData, setFormData] = useState({
        meetingDate: '',
        docUrl: '',
        name: '',
        stackId: '',
        id: '',
        actionItem: '',
        owner: '',
        ownerSlackId: '',
        dueDate: '',
        status: '',
        lastReminder: '',
        notes: '',
        overdue: '',
        duedays: ''
    });

    const handleInputChange = (e, field) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const triggerWebhook = async (pageId, url, data, isFetch = false, sectionId = null, method = 'POST', successMessage = 'Started') => {
        setLoading(pageId, true);
        setStatus(pageId, { type: 'info', message: 'Running...' });
        if (isFetch) {
            setFetchedData(null);
            setFetchedSection(null);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const fetchOptions = {
                method,
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            };
            if (method === 'POST') {
                fetchOptions.body = JSON.stringify(data);
            }

            // For non-fetch actions: show success immediately when connection is made
            if (!isFetch) {
                // Fire and forget — show popup right away, don't wait for workflow to finish
                fetch(url, fetchOptions).catch(() => { }); // ignore errors silently
                clearTimeout(timeoutId);
                setStatus(pageId, { type: 'success', message: successMessage });
                setLoading(pageId, false);
                // Extract page stays for 60 seconds, others for 15s
                const dismissTime = pageId === 'extract' ? 60000 : 15000;
                setTimeout(() => setStatus(pageId, { type: '', message: '' }), dismissTime);
                // Auto-refetch after Add/Edit
                if (sectionId && data.sheetUrl) {
                    setTimeout(() => {
                        triggerWebhook(pageId, url, { sheetUrl: data.sheetUrl }, true, sectionId);
                    }, 2000);
                }
                return;
            }

            // For fetch actions: wait for response and parse data
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            if (response.ok) {
                const result = await response.json();
                setFetchedData(result);
                setFetchedSection(sectionId);
                setStatus(pageId, { type: 'success', message: 'Data fetched successfully' });
            } else {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status}`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const errorMsg = error.name === 'AbortError'
                ? 'Timed out (60s). Ensure the n8n workflow is set to Active.'
                : error.message === 'Failed to fetch'
                    ? 'Network Error: Check CORS or n8n Active status'
                    : `Error: ${error.message}`;
            setStatus(pageId, { type: 'error', message: errorMsg });
        } finally {
            setLoading(pageId, false);
        }
    };

    const renderPage = () => {
        switch (activePage) {
            case 'extract':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="page-transition"
                    >
                        <div className="page-header">
                            <h1>Extract Actions</h1>
                        </div>
                        <div className="card">
                            <div className="input-group">
                                <label className="input-label">Meeting Date</label>
                                <input
                                    type="date"
                                    value={formData.meetingDate}
                                    onChange={(e) => handleInputChange(e, 'meetingDate')}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Document URL</label>
                                <input
                                    type="text"
                                    placeholder="https://example.com/document"
                                    value={formData.docUrl}
                                    onChange={(e) => handleInputChange(e, 'docUrl')}
                                />
                            </div>
                            <button
                                className={`btn ${isLoading('extract') ? 'loading' : ''}`}
                                disabled={isLoading('extract')}
                                onClick={() => triggerWebhook(
                                    'extract',
                                    'https://nisar1234.app.n8n.cloud/webhook/extract-actions',
                                    { meetingDate: formData.meetingDate, docUrl: formData.docUrl },
                                    false, null, 'POST',
                                    '✅ Workflow executed! Check your Action Items sheet and Slack for the extracted items.'
                                )}
                            >
                                <Play size={18} /> {isLoading('extract') ? 'Running...' : 'Run Flow'}
                            </button>
                            {getStatus('extract').message && (
                                <div className={`status-msg ${getStatus('extract').type}`} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                    {getStatus('extract').message}
                                </div>
                            )}
                            {/* Instruction box */}
                            <div style={{ marginTop: '1.2rem', padding: '1rem', background: '#f0f4ff', borderLeft: '4px solid var(--accent)', borderRadius: '6px' }}>
                                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0, lineHeight: '1.6' }}>
                                    <strong>How it works:</strong><br />
                                    1. Enter the meeting date and paste the Google Doc URL above.<br />
                                    2. Click <strong>"Run Flow"</strong> to start the workflow.<br />
                                    3. n8n will extract action items from your document.<br />
                                    4. Check your <strong>Action Items sheet</strong> and <strong>Slack</strong> for the results.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'preread':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="page-transition"
                    >
                        <div className="page-header">
                            <h1>Pre Read</h1>
                        </div>
                        <div className="card">
                            <button
                                className={`btn ${isLoading('preread') ? 'loading' : ''}`}
                                disabled={isLoading('preread')}
                                onClick={() => triggerWebhook('preread', 'https://nisar1234.app.n8n.cloud/webhook/pre-read', {}, false, null, 'GET')}
                            >
                                <BookOpen size={18} /> {isLoading('preread') ? 'Running...' : 'Run Pre Read'}
                            </button>
                            {getStatus('preread').message && (
                                <div className={`status-msg ${getStatus('preread').type}`}>{getStatus('preread').message}</div>
                            )}
                            {/* Instruction box */}
                            <div style={{ marginTop: '1.2rem', padding: '1rem', background: '#f0f4ff', borderLeft: '4px solid var(--accent)', borderRadius: '6px' }}>
                                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0, lineHeight: '1.6' }}>
                                    <strong>How it works:</strong><br />
                                    1. Click <strong>"Run Pre Read"</strong> to start the workflow.<br />
                                    2. n8n will generate the <strong>Pre Read summary</strong> from the available data.<br />
                                    3. The summary is sent to the <strong>admin for review and approval</strong>.<br />
                                    4. Once approved, the <strong>final Pre Read is posted to the Slack channel</strong>.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'sheets':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="page-transition"
                    >
                        <div className="page-header">
                            <h1>Update Google Sheets</h1>
                        </div>

                        {/* Team Members Section */}
                        <div className="section-container" style={{ marginBottom: '3rem' }}>
                            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '4px', height: '24px', background: 'var(--accent)', borderRadius: '2px' }}></div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>Team Members</h2>
                            </div>
                            <div className="card">
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                                    Manage your team members directory directly in Google Sheets.
                                </p>
                                <button
                                    className="btn"
                                    style={{ background: '#4b5563' }}
                                    onClick={() => window.open('https://docs.google.com/spreadsheets/d/1DL-CDOf8w8vh0hqAaAFxZhOr0a9LZTgk4fJwuaePtgU/edit?gid=0#gid=0', '_blank')}
                                >
                                    <ExternalLink size={18} /> Open Team Members Sheet
                                </button>
                            </div>
                        </div>

                        {/* Action Items Section */}
                        <div className="section-container">
                            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '4px', height: '24px', background: '#22c55e', borderRadius: '2px' }}></div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>Action Items</h2>
                            </div>
                            <div className="card">
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                                    Track and update action items directly in Google Sheets.
                                </p>
                                <button
                                    className="btn"
                                    style={{ background: '#4b5563' }}
                                    onClick={() => window.open('https://docs.google.com/spreadsheets/d/1DL-CDOf8w8vh0hqAaAFxZhOr0a9LZTgk4fJwuaePtgU/edit?gid=1864635265#gid=1864635265', '_blank')}
                                >
                                    <ExternalLink size={18} /> Open Action Items Sheet
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="sidebar">
                <div className="logo">
                    <LayoutDashboard size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    <span>PROPERTY FINDER</span>
                </div>
                <nav className="nav-links">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            className={`nav-item ${activePage === page.id ? 'active' : ''}`}
                            onClick={() => setActivePage(page.id)}
                        >
                            <page.icon size={20} />
                            <span>{page.name}</span>
                        </div>
                    ))}
                </nav>
            </div>

            <main className="main-content">
                <AnimatePresence mode="wait">
                    {renderPage()}
                </AnimatePresence>
            </main>
        </>
    );
}
