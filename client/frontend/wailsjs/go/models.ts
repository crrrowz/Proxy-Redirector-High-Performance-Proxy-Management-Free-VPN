export namespace metadata {
	
	export class UIInfo {
	    theme_color: string;
	    primary_font: string;
	
	    static createFrom(source: any = {}) {
	        return new UIInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme_color = source["theme_color"];
	        this.primary_font = source["primary_font"];
	    }
	}
	export class SystemInfo {
	    app_name: string;
	    version: string;
	    description: string;
	    manufacturer: string;
	    website: string;
	    support_email: string;
	    copyright: string;
	    ui: UIInfo;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.app_name = source["app_name"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.manufacturer = source["manufacturer"];
	        this.website = source["website"];
	        this.support_email = source["support_email"];
	        this.copyright = source["copyright"];
	        this.ui = this.convertValues(source["ui"], UIInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace models {
	
	export class Proxy {
	    id: string;
	    ip: string;
	    port: number;
	    type: string;
	    username?: string;
	    password?: string;
	    country?: string;
	    city?: string;
	    ping?: number;
	
	    static createFrom(source: any = {}) {
	        return new Proxy(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ip = source["ip"];
	        this.port = source["port"];
	        this.type = source["type"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.country = source["country"];
	        this.city = source["city"];
	        this.ping = source["ping"];
	    }
	}

}

export namespace pb {
	
	export class DiscoveryStatus {
	    enabled?: boolean;
	    paused?: boolean;
	    round?: number;
	    checked?: number;
	    alive_found?: number;
	    total_unchecked?: number;
	
	    static createFrom(source: any = {}) {
	        return new DiscoveryStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.paused = source["paused"];
	        this.round = source["round"];
	        this.checked = source["checked"];
	        this.alive_found = source["alive_found"];
	        this.total_unchecked = source["total_unchecked"];
	    }
	}
	export class PoolSummary {
	    total?: number;
	    alive?: number;
	    dead?: number;
	    dead_retryable?: number;
	    blacklisted?: number;
	    unchecked?: number;
	
	    static createFrom(source: any = {}) {
	        return new PoolSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.alive = source["alive"];
	        this.dead = source["dead"];
	        this.dead_retryable = source["dead_retryable"];
	        this.blacklisted = source["blacklisted"];
	        this.unchecked = source["unchecked"];
	    }
	}
	export class ProxyInfo {
	    id?: string;
	    ip?: string;
	    port?: number;
	    protocol?: number;
	    country?: string;
	    city?: string;
	    status?: number;
	    speed_ms?: number;
	    score?: number;
	    ssl_verified?: boolean;
	    consecutive_failures?: number;
	    is_active?: boolean;
	    username?: string;
	    password?: string;
	    last_checked?: timestamppb.Timestamp;
	
	    static createFrom(source: any = {}) {
	        return new ProxyInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ip = source["ip"];
	        this.port = source["port"];
	        this.protocol = source["protocol"];
	        this.country = source["country"];
	        this.city = source["city"];
	        this.status = source["status"];
	        this.speed_ms = source["speed_ms"];
	        this.score = source["score"];
	        this.ssl_verified = source["ssl_verified"];
	        this.consecutive_failures = source["consecutive_failures"];
	        this.is_active = source["is_active"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.last_checked = this.convertValues(source["last_checked"], timestamppb.Timestamp);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EngineStatus {
	    running?: boolean;
	    starting?: boolean;
	    mode?: string;
	    socks5_port?: number;
	    http_port?: number;
	    socks5_ok?: boolean;
	    http_ok?: boolean;
	    auth_enabled?: boolean;
	    local_ips?: string[];
	    active_proxy?: ProxyInfo;
	    pool?: PoolSummary;
	    discovery?: DiscoveryStatus;
	
	    static createFrom(source: any = {}) {
	        return new EngineStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.starting = source["starting"];
	        this.mode = source["mode"];
	        this.socks5_port = source["socks5_port"];
	        this.http_port = source["http_port"];
	        this.socks5_ok = source["socks5_ok"];
	        this.http_ok = source["http_ok"];
	        this.auth_enabled = source["auth_enabled"];
	        this.local_ips = source["local_ips"];
	        this.active_proxy = this.convertValues(source["active_proxy"], ProxyInfo);
	        this.pool = this.convertValues(source["pool"], PoolSummary);
	        this.discovery = this.convertValues(source["discovery"], DiscoveryStatus);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class RotationStatus {
	    enabled?: boolean;
	    pool_size?: number;
	    current_index?: number;
	    active_proxy_ip?: string;
	    active_proxy_port?: number;
	    active_proxy_type?: string;
	    interval_sec?: number;
	    proxy_types?: string[];
	    country_filter?: string;
	    max_speed_ms?: number;
	    ssl_only?: boolean;
	    filtered_count?: number;
	
	    static createFrom(source: any = {}) {
	        return new RotationStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.pool_size = source["pool_size"];
	        this.current_index = source["current_index"];
	        this.active_proxy_ip = source["active_proxy_ip"];
	        this.active_proxy_port = source["active_proxy_port"];
	        this.active_proxy_type = source["active_proxy_type"];
	        this.interval_sec = source["interval_sec"];
	        this.proxy_types = source["proxy_types"];
	        this.country_filter = source["country_filter"];
	        this.max_speed_ms = source["max_speed_ms"];
	        this.ssl_only = source["ssl_only"];
	        this.filtered_count = source["filtered_count"];
	    }
	}

}

export namespace proxy {
	
	export class ConnectedDevice {
	    ip: string;
	    name: string;
	    // Go type: time
	    connected_since: any;
	    active_conns: number;
	    bytes_transfer: number;
	
	    static createFrom(source: any = {}) {
	        return new ConnectedDevice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.name = source["name"];
	        this.connected_since = this.convertValues(source["connected_since"], null);
	        this.active_conns = source["active_conns"];
	        this.bytes_transfer = source["bytes_transfer"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace timestamppb {
	
	export class Timestamp {
	    seconds?: number;
	    nanos?: number;
	
	    static createFrom(source: any = {}) {
	        return new Timestamp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.seconds = source["seconds"];
	        this.nanos = source["nanos"];
	    }
	}

}

