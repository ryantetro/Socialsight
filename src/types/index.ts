export interface Metadata {
    url?: string;
    hostname?: string;
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    favicon?: string;
}

export interface AuditIssue {
    priority: 'high' | 'medium' | 'low';
    message: string;
}

export interface InspectionResult {
    metadata: Metadata;
    score: number;
    issues: AuditIssue[];
    stats?: {
        totalScans: number;
        percentile: number;
    };
    siteId?: string;
}

export interface AISuggestion {
    title: string;
    description: string;
}
