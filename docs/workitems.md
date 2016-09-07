# TFX Work Item commands

Create, query and view [Work items](https://www.visualstudio.com/en-us/docs/work/backlogs/add-work-items).

## Get started

To learn more about TFX, its pre-reqs and how to install, see the [readme](../README.md)

__Note:__ For work item commands to function when connecting to Team Foundation Server you must login  using the collection URL. On VSTS your normal account url will work fine. 

Team Foundation Server
> tfx login --service-url http://myServer/DefaultCollection


Visual Studio Team Services
> tfx login --service-url https://myAccount.VisualStudio.com


## Show work item details

### Usage

`tfx workitem show`

### Arguments

* `--work-item-id`: Work item id.

### Examples

#### Show a work item with id 2

```
tfx workitem show --work-item-id 2
```

## Query for work items

### Usage

```
tfx workitem query
```

### Arguments

* `--query`: WIQL query text.
* `--project`: Optional name of the project. This lets you use @Project and @CurrentIteration macros in the query.

### Example

```
tfx workitem query --project MyProject --query "select [system.id], [system.title] from WorkItems"
```

## Create a work item

### Usage

```
tfx workitem create
```

### Arguments

* `--project`: Name of the project.
* `--work-item-type`: Work Item type (e.g. Bug).
* `--title`: Title value
* `--assignedTo`: Assigned To value
* `--description`: Description value
* `--values`: JSON object of name/value pairs to set on the Work Item


### Examples

#### Create a work item with a given title
```
tfx workitem create --work-item-type Bug --project MyProject --title MyTitle
```

#### Create a work item with values specified from JSON (PowerShell)
```
tfx workitem create --work-item-type Bug --project MyProject --values --% {\"system.title\":\"MyTitle\", "system.description\":\"MyDescription\"}
```

#### Create a work item with values specified from JSON (CMD)
```
tfx workitem create --work-item-type Bug --project MyProject --values {\"system.title\":\"MyTitle\", "system.description\":\"MyDescription\"}
```


## Update a work item

### Usage

```
tfx workitem update
```

### Arguments

* `--work-item-id`: Name ID of the work item to update.
* `--title`: Title value
* `--assignedTo`: Assigned To value
* `--description`: Description value
* `--values`: JSON object of name/value pairs to set on the Work Item


### Examples

#### Update a work item with a given title
```
tfx workitem update --work-item-id 11 --title MyTitle
```

#### Update a work item with values specified from JSON (PowerShell)
```
tfx workitem update --work-item-id 11 --values --% {\"system.title\":\"MyTitle\", "system.description\":\"MyDescription\"}
```

#### Update a work item with values specified from JSON (CMD)
```
tfx workitem update --work-item-id 11 --values {\"system.title\":\"MyTitle\", "system.description\":\"MyDescription\"}
```
