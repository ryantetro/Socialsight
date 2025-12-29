import { useState, useEffect } from 'react';
import { Plus, Trash2, LineChart, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
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
    const { scrape, loading } = useScrape();

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
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedProject(null)}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            {selectedProject.hostname}
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs uppercase tracking-wider",
                                selectedProject.status === 'healthy' ? "bg-green-100 text-green-700" :
                                    selectedProject.status === 'warning' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                            )}>
                                {selectedProject.status}
                            </span>
                        </h2>
                        <a href={selectedProject.url} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium">
                            {selectedProject.url} <ExternalLink size={12} />
                        </a>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <button
                            onClick={handleRescan}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                            {loading ? "Scanning..." : "Scan Now"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Score Card */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Current OpenGraph Score</h3>
                                <div className="text-6xl font-black text-slate-900 tracking-tight">{selectedProject.lastScore}</div>
                            </div>
                            <div className="h-20 flex items-end gap-2">
                                {/* Historical bars (mock) */}
                                {[45, 50, 65, 70, 75, 82, selectedProject.lastScore].map((val, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 group">
                                        <div className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1">{val}</div>
                                        <div style={{ height: `${val / 1.5}px` }} className={cn(
                                            "w-4 rounded-t-md transition-all",
                                            i === 6 ? "bg-blue-600" : "bg-slate-100 group-hover:bg-slate-200"
                                        )} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Alerts */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
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
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg mb-4">Live Preview</h3>
                            {selectedProject.metadata?.ogImage ? (
                                <div className="rounded-xl overflow-hidden border border-slate-100 aspect-[1.91/1] bg-slate-100 relative group cursor-pointer hover:ring-4 hover:ring-blue-500/20 transition-all">
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

                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse",
                                project.status === 'healthy' ? "bg-green-500" :
                                    project.status === 'warning' ? "bg-yellow-500" : "bg-red-500"
                            )} />
                            <h3 className="font-bold text-lg text-slate-900 truncate">{project.hostname}</h3>
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

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg">
                                <CheckCircle2 size={14} className="text-green-600" />
                                Last scan: {new Date(project.lastScan).toLocaleDateString()}
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
        </div>
    );
}
