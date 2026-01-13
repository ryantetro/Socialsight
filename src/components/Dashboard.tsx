import { useState, useEffect } from 'react';
import { Plus, Trash2, LineChart, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink, RefreshCw, Shield, X, CreditCard } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useScrape } from '@/hooks/useScrape';
import { InspectionResult } from '@/types';

interface Project {
    id: string;
    hostname: string;
    url: string;
    lastScore: number;
    status: 'healthy' | 'warning' | 'critical';
    lastScan: string;
    metadata?: InspectionResult['metadata'];
}

export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [showFeaturedModal, setShowFeaturedModal] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { scrape, loading } = useScrape();

    useEffect(() => {
        if (searchParams.get('redirect') === 'featured') {
            setShowFeaturedModal(true);
            // Clean up URL
            router.replace('/dashboard');
        }
    }, [searchParams, router]);

    useEffect(() => {
        const saved = localStorage.getItem('guardian_projects');
        if (saved) {
            setProjects(JSON.parse(saved));
        }
    }, []);

    const saveProjects = (newProjects: Project[]) => {
        setProjects(newProjects);
        localStorage.setItem('guardian_projects', JSON.stringify(newProjects));
    };

    const handleAddProject = async () => {
        if (!newUrl) return;

        const result = await scrape(newUrl);
        if (result) {
            const newProject: Project = {
                id: crypto.randomUUID(),
                hostname: result.metadata.hostname || newUrl,
                url: result.metadata.url || newUrl,
                lastScore: result.score,
                status: result.score >= 90 ? 'healthy' : result.score >= 50 ? 'warning' : 'critical',
                lastScan: new Date().toISOString(),
                metadata: result.metadata
            };
            saveProjects([...projects, newProject]);
            setNewUrl('');
            setIsAdding(false);
        }
    };

    const removeProject = (id: string) => {
        saveProjects(projects.filter(p => p.id !== id));
    };

    const handleRescan = async () => {
        if (!selectedProject) return;

        const result = await scrape(selectedProject.url);
        if (result) {
            const updatedProject: Project = {
                ...selectedProject,
                lastScore: result.score,
                status: result.score >= 90 ? 'healthy' : result.score >= 50 ? 'warning' : 'critical',
                lastScan: new Date().toISOString(),
                metadata: result.metadata
            };

            // Update local state
            setSelectedProject(updatedProject);

            // Update projects list
            const updatedList = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
            saveProjects(updatedList);
        }
    };

    if (selectedProject) {
        return (
            <div className="space-y-6 md:space-y-8 animate-fade-in pb-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <button
                        onClick={() => setSelectedProject(null)}
                        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1 w-full md:w-auto">
                        <div className="flex items-center gap-2 md:gap-3 mb-1">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 p-1 shrink-0">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${selectedProject.hostname}&sz=64`}
                                    alt="favicon"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                                {selectedProject.hostname}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs md:pl-11">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 transition-colors",
                                selectedProject.status === 'healthy' ? "bg-green-100 text-green-700" :
                                    selectedProject.status === 'warning' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                            )}>
                                {selectedProject.status === 'healthy' && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}
                                {selectedProject.status === 'healthy' ? 'Monitoring Active' : selectedProject.status}
                            </span>
                            <span className="text-slate-300">•</span>
                            <a href={selectedProject.url} target="_blank" rel="noreferrer" className="hover:text-blue-600 flex items-center gap-1 truncate transition-colors">
                                {selectedProject.url} <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                    <div className="w-full md:w-auto ml-auto flex items-center gap-3">
                        <button
                            onClick={handleRescan}
                            disabled={loading}
                            className="w-full md:w-auto px-4 py-3 md:py-2 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 shadow-lg shadow-slate-900/10 active:scale-95"
                        >
                            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                            {loading ? "Scanning..." : "Scan Now"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Left Column: Stats */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Score Card */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all group-hover:bg-blue-500/10" />

                            <div className="relative z-10 w-full sm:w-auto">
                                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    Current OpenGraph Score
                                </h3>
                                <div className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight">{selectedProject.lastScore}</div>
                            </div>
                            <div className="h-20 w-full sm:w-auto flex items-end gap-2 relative z-10">
                                {/* Historical bars (mock) */}
                                {[45, 50, 65, 70, 75, 82, selectedProject.lastScore].map((val, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 group/bar flex-1 sm:flex-none">
                                        <div className="text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity mb-1 absolute -top-4">{val}</div>
                                        <div style={{ height: `${val / 1.5}px` }} className={cn(
                                            "w-full sm:w-4 rounded-t-md transition-all",
                                            i === 6 ? "bg-blue-600" : "bg-slate-100 group-hover:bg-slate-200"
                                        )} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Alerts */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg mb-6">Recent Alerts</h3>
                            <div className="space-y-4">
                                {selectedProject.lastScore < 90 ? (
                                    <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-xl text-yellow-800 border border-yellow-100">
                                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <div className="font-bold text-sm">Score Drop Detected</div>
                                            <p className="text-xs opacity-80 mt-1">Your score is below optimal levels. Review title and description length.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl text-green-800 border border-green-100">
                                        <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <div className="font-bold text-sm">All Systems Healthy</div>
                                            <p className="text-xs opacity-80 mt-1">Your OG tags are optimized and performing well.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg mb-4">Live Preview</h3>
                            {selectedProject.metadata?.ogImage ? (
                                <div className="rounded-xl overflow-hidden border border-slate-100 aspect-[1.91/1] bg-slate-100 relative group cursor-pointer hover:ring-4 hover:ring-blue-500/20 transition-all" role="button">
                                    <img src={selectedProject.metadata.ogImage} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">
                                        View Full Size
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-[1.91/1] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                    No Image
                                </div>
                            )}
                            <div className="mt-4 space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Title</label>
                                    <div className="text-sm font-medium text-slate-800 line-clamp-2 leading-relaxed">
                                        {selectedProject.metadata?.title || "Missing Title"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Description</label>
                                    <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                        {selectedProject.metadata?.description || "Missing Description"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">The Guardian</h2>
                    <p className="text-slate-500 font-medium">Automated daily monitoring for your most important assets.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-95"
                >
                    <Plus size={18} /> Add Project
                </button>
            </div>

            {isAdding && (
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex gap-4 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        placeholder="Enter URL to monitor..."
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                        onClick={handleAddProject}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Scanning..." : "Track"}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        role="button"
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group relative"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeProject(project.id);
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${project.hostname}&sz=64`}
                                    alt={project.hostname}
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-lg text-slate-900 truncate">{project.hostname}</h3>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full animate-pulse",
                                        project.status === 'healthy' ? "bg-green-500" :
                                            project.status === 'warning' ? "bg-yellow-500" : "bg-red-500"
                                    )} />
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                        {project.status === 'healthy' ? 'Active' : project.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Current Score</label>
                                    <div className="text-4xl font-black text-slate-900">{project.lastScore}</div>
                                </div>
                                <div className="h-10 flex items-end gap-1">
                                    {/* Mock Graph Bars */}
                                    {[40, 60, 55, 78, 85, project.lastScore].map((val, i) => (
                                        <div key={i} style={{ height: `${val / 1.5}%` }} className={cn(
                                            "w-2 rounded-t-sm transition-colors",
                                            i === 5 ? "bg-blue-600" : "bg-slate-100"
                                        )} />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-blue-600 fill-blue-600/20" />
                                    <span className="text-blue-700">Protected</span>
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                    Next check: {(() => {
                                        const nextCheck = new Date(project.lastScan).getTime() + (24 * 60 * 60 * 1000);
                                        const diff = nextCheck - Date.now();
                                        if (diff <= 0) return 'Scanning...';
                                        const h = Math.floor(diff / (1000 * 60 * 60));
                                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                        return `${h}h ${m}m`;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {projects.length === 0 && !isAdding && (
                    <div className="col-span-full py-20 text-center text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <LineChart className="w-12 h-12 mx-auto opacity-20" />
                        <p>No projects tracked yet. Add one to start monitoring.</p>
                    </div>
                )}
            </div>
            {showFeaturedModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-xl text-slate-900">Get Verified</h3>
                            <button
                                onClick={() => setShowFeaturedModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-blue-50 text-blue-900 text-sm font-medium rounded-xl border border-blue-100 flex gap-3">
                                <Shield className="shrink-0 text-blue-600" size={20} />
                                <p>You verify your site. We grant you the badge. Unlock premium trust signals for your visitors.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Website URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://yourwebsite.com"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Company Name</label>
                                    <input
                                        type="text"
                                        placeholder="Acme Inc."
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10">
                                    <CreditCard size={18} />
                                    Proceed to Checkout ($29)
                                </button>
                                <p className="text-center text-xs text-slate-400 mt-4 font-medium">
                                    Secure payment via Stripe • One-time fee
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
