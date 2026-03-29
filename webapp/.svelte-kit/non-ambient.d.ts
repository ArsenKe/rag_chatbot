
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/api" | "/api/ai" | "/api/ai/ask" | "/api/assignments" | "/api/auth" | "/api/auth/login" | "/api/bookings" | "/api/cars" | "/api/drivers" | "/api/reports" | "/(app)/bookings" | "/(app)/calendar" | "/(app)/cars" | "/(app)/dashboard" | "/(app)/drivers" | "/login" | "/(app)/reports";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/(app)": Record<string, never>;
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/ai": Record<string, never>;
			"/api/ai/ask": Record<string, never>;
			"/api/assignments": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/bookings": Record<string, never>;
			"/api/cars": Record<string, never>;
			"/api/drivers": Record<string, never>;
			"/api/reports": Record<string, never>;
			"/(app)/bookings": Record<string, never>;
			"/(app)/calendar": Record<string, never>;
			"/(app)/cars": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/drivers": Record<string, never>;
			"/login": Record<string, never>;
			"/(app)/reports": Record<string, never>
		};
		Pathname(): "/" | "/api/ai/ask" | "/api/assignments" | "/api/auth/login" | "/api/bookings" | "/api/cars" | "/api/drivers" | "/api/reports" | "/bookings" | "/calendar" | "/cars" | "/dashboard" | "/drivers" | "/login" | "/reports";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}