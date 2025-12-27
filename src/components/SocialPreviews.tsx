import { Twitter, Linkedin, Facebook, MessageSquare, ImageOff } from 'lucide-react';
import { Metadata } from '@/types';

interface PreviewProps {
    metadata: Metadata;
}

export default function SocialPreviews({ metadata }: PreviewProps) {
    const { title, description, ogImage, twitterImage, ogTitle, ogDescription, hostname } = metadata;
    const image = ogImage || twitterImage;
    const displayTitle = ogTitle || title || 'No Title Found';
    const displayDesc = ogDescription || description || 'No description found...';
    const displayHost = hostname || 'yourwebsite.com';

    const ImagePlaceholder = ({ compact = false }: { compact?: boolean }) => (
        <div className={`w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 border-2 border-dashed border-slate-100 ${compact ? 'p-2' : ''}`}>
            <ImageOff className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} opacity-20`} />
            {!compact && <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-center px-4">Missing Preview Image</span>}
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in animate-delay-2">
            {/* Twitter Card */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <Twitter className="w-4 h-4" />
                    <span>X (Twitter)</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center overflow-hidden">
                        {image ? (
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImagePlaceholder />
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-100">
                        <div className="text-[14px] font-bold line-clamp-1">{displayTitle}</div>
                        <div className="text-[13px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">{displayDesc}</div>
                        <div className="text-[12px] text-slate-400 mt-1 uppercase tracking-tight font-medium">{displayHost}</div>
                    </div>
                </div>
            </div>

            {/* LinkedIn Card */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[1.91/1] bg-slate-100 overflow-hidden">
                        {image ? (
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImagePlaceholder />
                        )}
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <div className="text-[13px] font-bold line-clamp-1 leading-tight">{displayTitle}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{displayHost}</div>
                    </div>
                </div>
            </div>

            {/* Facebook Card */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                </div>
                <div className="border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[1.91/1] bg-slate-100 overflow-hidden">
                        {image ? (
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImagePlaceholder />
                        )}
                    </div>
                    <div className="p-2.5 bg-[#f2f3f5] border-t border-slate-200">
                        <div className="text-[11px] text-slate-500 uppercase font-medium">{displayHost}</div>
                        <div className="text-[16px] font-bold line-clamp-1 mt-0.5">{displayTitle}</div>
                        <div className="text-[13px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">{displayDesc}</div>
                    </div>
                </div>
            </div>

            {/* iMessage / SMS Card */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4" />
                    <span>iMessage</span>
                </div>
                <div className="bg-[#f0f0f0] p-4 rounded-3xl h-full flex items-end">
                    <div className="max-w-[85%] space-y-1">
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center overflow-hidden">
                                {image ? (
                                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImagePlaceholder compact />
                                )}
                            </div>
                            <div className="p-2.5 space-y-0.5">
                                <div className="text-[12px] font-semibold text-black line-clamp-1">{displayTitle}</div>
                                <div className="text-[11px] text-slate-500 line-clamp-1">{displayHost}</div>
                            </div>
                        </div>
                        <div className="bg-[#007AFF] text-white px-4 py-2 rounded-2xl rounded-bl-sm inline-block text-[14px] font-medium leading-tight">
                            Check out this link!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
