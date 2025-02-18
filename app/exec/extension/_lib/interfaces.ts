/**
 * Represents a part in an OPC package
 */
export interface PackagePart {
	contentType?: string;
	partName: string;
}

/**
 * List of files in the package, mapped to null, or, if it can't be properly auto-
 * detected, a content type.
 */
export interface PackageFiles {
	[path: string]: FileDeclaration;
}

/**
 * Describes a file in a manifest
 */
export interface FileDeclaration {
	/**
	 * The type of this asset (Type attribute in the vsixmanifest's <Asset> entry)
	 * Also used as the addressable name of this asset (if addressable = true)
	 * If a string[] is provided, multiple <Asset> entries will be added.
	 */
	assetType?: string | string[];

	/**
	 * Manually specified content-type/mime-type. Otherwise, try to automatically determine.
	 */
	contentType?: string;

	/**
	 * True means that this file was added indirectly, e.g. from a directory. Files that have
	 * auto = true will be overridden by files with the same path that do not.
	 */
	auto?: boolean;

	/**
	 * Path to the file on disk
	 */
	path: string;

	/**
	 * Path/file name to the file in the archive
	 */
	partName?: string;

	/**
	 * Alias to partName
	 */
	packagePath?: string;

	/**
	 * Language of this asset, if any
	 */
	lang?: string;

	/**
	 * If true, this asset will be addressable via a public gallery endpoint
	 */
	addressable?: boolean;

	/**
	 * If content is not empty, this string will be used as the packaged contents
	 * rather than the contents of <path> on the file system.
	 */
	content?: string;

	/**
	 * If true, this file will be included when only writing vsix metadata
	 */
	isMetadata?: boolean;
}

/**
 * Describes a base asset declaration
 */
export interface AssetDeclaration {
	path: string;
	contentType?: string;
}

/**
 * Describes a screenshot in the manifest
 */
export interface ScreenshotDeclaration extends AssetDeclaration {}

/**
 * Describes a details file in the manifest
 */
export interface DetailsDeclaration extends AssetDeclaration {}

/**
 * Describes a link in the manifest
 */
export interface LinkDeclaration {
	url: string;
}

/**
 * Describes a set of links keyed off the link type in the manifest.
 */
export interface Links {
	[type: string]: LinkDeclaration;
}

/**
 * Describes a target in the manifest
 */
export interface TargetDeclaration {
	id: string;
	version?: string;
}

/**
 * Describes the extension's branding in the manifest.
 */
export interface BrandingDeclaration {
	color: string;
	theme: string;
}

export interface CustomerQnASupport {
	enableMarketplaceQnA?: boolean;
	url?: string;
}

/**
 * Settings for doing the merging
 */
export interface MergeSettings {
	/**
	 * Root of source manifests
	 */
	root: string;

	/*
	 * Manifest in the form of a standard Node.js CommonJS module with an exported function.  
	 * The function takes an environment as a parameter and must return the manifest JSON object.  
	 * Environment variables are specified with the env command line parameter.
	 * If this is present then manifests and manifestGlobs are ignored.
	 */
	manifestJs: string;

	/*
	 * A series of environment variables that are passed to the function exported from the manifestJs module.
	 */
	env: string[];

	/*
	 * List of paths to manifest files
	 */
	manifests: string[];

	/**
	 * List of globs for searching for partial manifests
	 */
	manifestGlobs: string[];

	/**
	 * Highest priority partial manifest
	 */
	overrides: any;

	/**
	 * True to bypass validation during packaging.
	 */
	bypassValidation: boolean;

	/**
	 * True to rev the version of the extension before packaging.
	 */
	revVersion: boolean;

	/**
	 * Path to the root of localized resource files
	 */
	locRoot: string;

	/**
	 * If true, treat JSON files as "Json 5" or "extended JSON",
	 * which supports comments, unquoted keys, etc.
	 */
	json5: boolean;
}

export interface PackageSettings {
	/**
	 * Path to the generated vsix
	 */
	outputPath: string;

	/**
	 * Path to the root of localized resource files
	 */
	locRoot: string;

	/**
	 * Only output metadata for the extension rather than a full package
	 */
	metadataOnly: boolean;
}

export interface PublishSettings {
	/**
	 * URL to the market
	 */
	galleryUrl?: string;

	/**
	 * Path to a vsix to publish
	 */
	vsixPath?: string;

	/**
	 * Publisher to identifiy an extension
	 */
	publisher?: string;

	/**
	 * Name of an extension belonging to publisher
	 */
	extensionId?: string;

	/**
	 * List of Azure Devops organization to share an extension with.
	 */
	shareWith?: string[];

	/**
	 * If true, command will not wait for extension to be validated.
	 */
	noWaitValidation?: boolean;

	/**
	 * If true, publish will not halt in the event of requiring new scopes.
	 */
	bypassScopeCheck?: boolean;
}

/*** Types related to localized resources ***/

export interface ResourcesFile {
	[key: string]: string;
}

// Models the schema outlined at https://msdn.microsoft.com/en-us/library/dd997147.aspx
export interface VsixLanguagePack {
	VsixLanguagePack: {
		$: {
			Version: string;
			xmlns: string;
		};
		LocalizedName: [string];
		LocalizedDescription: [string];
		LocalizedReleaseNotes: [string];
		License: [string];
		MoreInfoUrl: [string];
	};
}

export interface ResourceSet {
	manifestResources: { [manifestType: string]: ResourcesFile };
	combined: ResourcesFile;
}

export interface LocalizedResources {
	[languageTag: string]: ResourcesFile;
	defaults: ResourcesFile;
}

/*** Types for VSIX Manifest ****/

export namespace Vsix {
	export interface PackageManifestAttr {
		Version?: string;
		xmlns?: string;
		"xmlns:d"?: string;
	}

	export interface IdentityAttr {
		Language?: string;
		Id?: string;
		Version?: string;
		Publisher?: string;
	}

	export interface Identity {
		$?: IdentityAttr;
	}

	export interface DescriptionAttr {
		"xml:space"?: string;
	}

	export interface Description {
		$?: DescriptionAttr;
		_?: string;
	}

	export interface Properties {
		Property?: Property[];
	}

	export interface PropertyAttr {
		Id?: string;
		Value?: string;
	}

	export interface Property {
		$?: PropertyAttr;
	}

	export interface Metadata {
		Identity?: [Identity];
		DisplayName?: [string];
		Description?: [Description];
		ReleaseNotes?: [string];
		Tags?: [string];
		GalleryFlags?: [string];
		Categories?: [string];
		Icon?: [string];
		Properties?: [Properties];
	}

	export interface InstallationTargetAttr {
		Id?: string;
		Version?: string;
	}

	export interface InstallationTarget {
		$?: InstallationTargetAttr;
	}

	export interface Installation {
		InstallationTarget?: [InstallationTarget];
	}

	export interface AssetAttr {
		Type?: string;
		"d:Source"?: string;
		Path?: string;
		Addressable?: string;
	}

	export interface Asset {
		$?: AssetAttr;
	}

	export interface Assets {
		Asset?: Asset[];
	}

	export interface PackageManifest {
		$?: PackageManifestAttr;
		Metadata?: [Metadata];
		Installation?: [Installation];
		Dependencies?: [string];
		Assets?: [Assets];
	}

	export interface VsixManifest {
		PackageManifest?: PackageManifest;
	}
}
