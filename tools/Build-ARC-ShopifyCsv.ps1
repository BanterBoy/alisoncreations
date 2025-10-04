[CmdletBinding()]
param(
    [string]$ArcCsvPath,
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertToArcTitleCase {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $Text
    }
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    return $culture.TextInfo.ToTitleCase($Text.ToLowerInvariant())
}

function Get-GitInfo {
    param([string]$RepoRoot)
    Push-Location -Path $RepoRoot
    try {
        $originUrl = (git remote get-url origin 2>$null).Trim()
        if (-not $originUrl) {
            throw 'Unable to determine git remote origin URL.'
        }
        $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
        if (-not $branch) {
            throw 'Unable to determine current git branch.'
        }
        if ($originUrl -match 'github.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(?:\.git)?$') {
            $owner = $Matches.owner
            $repo = $Matches.repo
        }
        else {
            throw "Unsupported remote URL format: $originUrl"
        }
        return [pscustomobject]@{
            Owner   = $owner
            Repo    = $repo
            Branch  = $branch
            RawBase = "https://raw.githubusercontent.com/$owner/$repo/$branch"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-RawUrl {
    param(
        [string]$RawBase,
        [string]$RelativePath
    )
    $segments = $RelativePath -split '/'
    $encodedSegments = $segments | ForEach-Object { [System.Uri]::EscapeDataString($_) }
    return ($RawBase.TrimEnd('/') + '/' + ($encodedSegments -join '/'))
}

function Parse-ArcName {
    param(
        [string]$BaseName,
        [string[]]$ColorWords,
        [string[]]$ColorModifiers
    )

    $raw = $BaseName
    $name = $raw -replace '_', ' '
    $name = $name -replace '-', ' '
    $name = $name -replace '\.', ' '
    $name = $name -replace '\s+', ' '
    $name = $name.Trim()
    $name = $name -replace '\s*\(\d+\)$', ''
    $name = $name.Trim(' .-_')
    $name = $name -replace '\s+', ' '

    $quote = $null
    $quoteMatch = [regex]::Match($raw, '"(?<text>.+?)"')
    if (-not $quoteMatch.Success) {
        $quoteMatch = [regex]::Match($raw, "'(?<text>.+?)'")
    }
    if (-not $quoteMatch.Success) {
        $quoteMatch = [regex]::Match($raw, '[\u201C\u2018](?<text>.+?)[\u201D\u2019]')
    }
    if ($quoteMatch.Success) {
        $quote = $quoteMatch.Groups['text'].Value.Trim()
    }

    $tokens = if ($name) { ([string]$name) -split '\s+' } else { @() }
    $colorTokens = New-Object System.Collections.Generic.List[string]
    $index = $tokens.Length - 1
    while ($index -ge 0) {
        $tokenRaw = [string]$tokens[$index]
        $trimmedToken = $tokenRaw.Trim('.')
        $token = $trimmedToken.ToLowerInvariant()
        if (-not $token) {
            $index--
            continue
        }
        $normalizedToken = ConvertToArcTitleCase($trimmedToken)
        $matchKey = ($token -replace '[^a-z]', '')
        if ($ColorWords -contains $matchKey) {
            $colorTokens.Insert(0, $normalizedToken)
            $index--
            continue
        }
        elseif ($ColorModifiers -contains $matchKey -and $colorTokens.Count -gt 0) {
            $colorTokens.Insert(0, $normalizedToken)
            $index--
            continue
        }
        else {
            break
        }
    }
    if ($index -ge 0) {
        $baseTokens = $tokens[0..$index]
    }
    else {
        $baseTokens = @()
    }

    $baseCore = ($baseTokens -join ' ').Trim()
    if (-not $baseCore) {
        $baseCore = $name
    }

    $colorValue = if ($colorTokens.Count -gt 0) { ($colorTokens -join ' ') } else { $null }

    $title = ConvertToArcTitleCase($baseCore)
    $title = ($title -replace '\s+', ' ').Trim()
    if (-not $title) {
        $title = 'Untitled'
    }

    $handle = $title.ToLowerInvariant()
    $handle = $handle -replace '[^a-z0-9]+', '-'
    $handle = $handle.Trim('-')
    if (-not $handle) {
        $handle = ($raw.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
    }

    return [pscustomobject]@{
        Title  = $title
        Handle = $handle
        Color  = $colorValue
        Quote  = $quote
    }
}

function Build-Tags {
    param(
        [string]$Title,
        [string[]]$VariantColors
    )

    $stopWords = @('and','the','with','a','an','of','for','to','on','in')
    $set = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($word in $Title -split '\s+') {
        $cleanWord = $word.Trim(',')
        if ($cleanWord -and -not ($stopWords -contains $cleanWord.ToLowerInvariant())) {
            [void]$set.Add($cleanWord)
        }
    }
    foreach ($color in $VariantColors) {
        if (-not $color) { continue }
        foreach ($part in $color -split '[\/&]') {
            $clean = $part.Trim()
            if ($clean) {
                $normalizedColor = ConvertToArcTitleCase($clean)
                [void]$set.Add($normalizedColor)
            }
        }
    }
    return ($set | Sort-Object)
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        [void](New-Item -ItemType Directory -Path $Path)
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$defaultRepoRoot = (Resolve-Path (Join-Path $scriptRoot '..')).Path

if (-not $ArcCsvPath) {
    $ArcCsvPath = Join-Path $defaultRepoRoot 'resources/ARCfiles.csv'
}
$ArcCsvPath = (Resolve-Path $ArcCsvPath).Path

if (-not $OutputPath) {
    $OutputPath = Join-Path $defaultRepoRoot 'shopify/products_import.csv'
}
$OutputDirectory = Split-Path -Parent $OutputPath
if ($OutputDirectory) {
    Ensure-Directory -Path $OutputDirectory
}

$gitInfo = Get-GitInfo -RepoRoot $defaultRepoRoot

$imageExtensions = @('.jpg','.jpeg','.png','.gif','.webp')
$videoExtensions = @('.mp4','.mov','.webm','.m4v','.ts')
$colorWords = @('pink','white','yellow','blue','gold','silver','black','green','red','purple','teal','grey','gray','brown','cream','mauve','jade','orange','clear','silver','bronze','mix')
$colorModifiers = @('light','dark','deep','bright','pale','soft','warm','cool')

$data = Import-Csv -Path $ArcCsvPath | Where-Object { $_.PSIsContainer -eq 'False' -and $_.Exists -eq 'True' }

$productMap = @{}
$totalVideoFiles = 0

foreach ($row in $data) {
    $extension = ($row.Extension ?? '').ToLowerInvariant()
    $parsed = Parse-ArcName -BaseName $row.BaseName -ColorWords $colorWords -ColorModifiers $colorModifiers
    if (-not $parsed) { continue }

    $productKey = $parsed.Handle
    if (-not $productMap.ContainsKey($productKey)) {
        $productMap[$productKey] = [ordered]@{
            Title    = $parsed.Title
            Handle   = $parsed.Handle
            Quote    = $parsed.Quote
            Variants = @{}
            Images   = [System.Collections.Generic.List[object]]::new()
            Videos   = [System.Collections.Generic.List[object]]::new()
        }
    }

    $product = $productMap[$productKey]
    if ($parsed.Quote -and -not $product.Quote) {
        $product.Quote = $parsed.Quote
    }

    $color = $parsed.Color

    if ($imageExtensions -contains $extension) {
        $variantKey = if ($color) { $color } else { 'Default' }
        if (-not $product.Variants.ContainsKey($variantKey)) {
            $product.Variants[$variantKey] = [ordered]@{
                Color       = $color
                OptionValue = if ($color) { $color } else { 'Default Title' }
            }
        }
        $product.Images.Add([pscustomobject]@{
            FileName = $row.Name
            Color    = $color
        })
    }
    elseif ($videoExtensions -contains $extension) {
        $product.Videos.Add([pscustomobject]@{
            FileName = $row.Name
            Color    = $color
        })
        $totalVideoFiles++
    }
}

$headers = @(
    'Handle','Title','Body (HTML)','Vendor','Type','Tags','Published',
    'Option1 Name','Option1 Value','Option2 Name','Option2 Value','Option3 Name','Option3 Value',
    'Variant SKU','Variant Grams','Variant Inventory Tracker','Variant Inventory Qty','Variant Inventory Policy','Variant Fulfillment Service',
    'Variant Price','Variant Compare At Price','Variant Requires Shipping','Variant Taxable','Variant Barcode',
    'Image Src','Image Position','Image Alt Text','Gift Card','SEO Title','SEO Description',
    'Google Shopping / Google Product Category','Google Shopping / Gender','Google Shopping / Age Group','Google Shopping / MPN',
    'Google Shopping / AdWords Grouping','Google Shopping / AdWords Labels','Google Shopping / Condition','Google Shopping / Custom Product',
    'Google Shopping / Custom Label 0','Google Shopping / Custom Label 1','Google Shopping / Custom Label 2','Google Shopping / Custom Label 3','Google Shopping / Custom Label 4',
    'Variant Image','Variant Weight Unit','Variant Tax Code','Cost per item','Included / [Primary]','Included / International','Status','product.metafields.custom.quote'
)

$rows = [System.Collections.Generic.List[object]]::new()
$variantCount = 0
$totalImages = 0
$totalVideos = 0

$products = $productMap.GetEnumerator() | Sort-Object { $_.Value.Title }

foreach ($entry in $products) {
    $product = $entry.Value
    $variantKeys = $product.Variants.Keys
    if ($variantKeys.Count -eq 0) {
        continue
    }

    $option1Name = if ($variantKeys.Count -eq 1 -and $variantKeys -contains 'Default') { 'Title' } else { 'Color' }
    $variantColors = $product.Variants.Values | ForEach-Object { $_.Color } | Where-Object { $_ }
    $tags = Build-Tags -Title $product.Title -VariantColors $variantColors
    $tagsString = [string]::Join(', ', $tags)

    $bodyHtml = "Hand-made resin creation: $($product.Title)."
    if ($product.Quote) {
        $bodyHtml += " <blockquote>$($product.Quote)</blockquote>"
    }

    $images = @($product.Images | Sort-Object FileName)
    $totalImages += $images.Count
    foreach ($image in $images) {
        if (-not ($image | Get-Member -Name Used -MemberType NoteProperty -ErrorAction SilentlyContinue)) {
            Add-Member -InputObject $image -MemberType NoteProperty -Name Used -Value $false
        }
        if (-not ($image | Get-Member -Name Position -MemberType NoteProperty -ErrorAction SilentlyContinue)) {
            Add-Member -InputObject $image -MemberType NoteProperty -Name Position -Value $null
        }
    }

    $positionCounter = 1
    $orderedVariants = $product.Variants.GetEnumerator() | Sort-Object { $_.Value.OptionValue }

    foreach ($variantEntry in $orderedVariants) {
        $variant = $variantEntry.Value
        $variantCount++

        $selectedImage = $null
        if ($images.Count -gt 0) {
            if ($variant.Color) {
                $selectedImage = $images | Where-Object { -not $_.Used -and $_.Color -eq $variant.Color } | Select-Object -First 1
            }
            if (-not $selectedImage) {
                $selectedImage = $images | Where-Object { -not $_.Used } | Select-Object -First 1
            }
        }

        $imageSrc = ''
        $imageAlt = ''
        $imagePosition = ''
        if ($selectedImage) {
            $selectedImage.Used = $true
            if (-not $selectedImage.Position) {
                $selectedImage.Position = $positionCounter
                $positionCounter++
            }
            $imagePosition = $selectedImage.Position
            $imageAlt = if ($variant.Color) { "$($product.Title) - $($variant.Color)" } else { $product.Title }
            $relative = "resources/images/$($selectedImage.FileName)"
            $imageSrc = Get-RawUrl -RawBase $gitInfo.RawBase -RelativePath $relative
        }

        $row = [ordered]@{}
        foreach ($header in $headers) {
            $row[$header] = ''
        }

        $row['Handle'] = $product.Handle
        $row['Title'] = $product.Title
        $row['Body (HTML)'] = $bodyHtml
        $row['Vendor'] = 'Alison Resin Creations (ARC)'
        $row['Type'] = 'Resin Art'
        $row['Tags'] = $tagsString
        $row['Published'] = 'TRUE'
        $row['Option1 Name'] = $option1Name
        $row['Option1 Value'] = $variant.OptionValue
        $row['Variant Grams'] = '0'
        $row['Variant Inventory Qty'] = '0'
        $row['Variant Inventory Policy'] = 'deny'
        $row['Variant Fulfillment Service'] = 'manual'
        $row['Variant Price'] = '0.00'
        $row['Variant Requires Shipping'] = 'TRUE'
        $row['Variant Taxable'] = 'TRUE'
        $row['Image Src'] = $imageSrc
        $row['Image Position'] = $imagePosition
        $row['Image Alt Text'] = $imageAlt
        $row['Gift Card'] = 'FALSE'
        $row['SEO Title'] = $product.Title
        $row['SEO Description'] = "Discover the $($product.Title) from Alison Resin Creations (ARC)."
        $row['Variant Weight Unit'] = 'g'
        $row['Cost per item'] = '0.00'
        $row['Included / [Primary]'] = 'TRUE'
        $row['Included / International'] = 'TRUE'
        $row['Status'] = 'active'
        $row['product.metafields.custom.quote'] = if ($product.Quote) { $product.Quote } else { '' }

        $rows.Add([pscustomobject]$row)
    }

    foreach ($image in $images | Where-Object { -not $_.Used }) {
        if (-not $image.Position) {
            $image.Position = $positionCounter
            $positionCounter++
        }
        $additional = [ordered]@{}
        foreach ($header in $headers) {
            $additional[$header] = ''
        }
        $additional['Handle'] = $product.Handle
        $additional['Image Src'] = Get-RawUrl -RawBase $gitInfo.RawBase -RelativePath "resources/images/$($image.FileName)"
        $additional['Image Position'] = $image.Position
        $additional['Image Alt Text'] = if ($image.Color) { "$($product.Title) - $($image.Color)" } else { $product.Title }
        $rows.Add([pscustomobject]$additional)
    }

    $totalVideos += $product.Videos.Count
}

$rows | Export-Csv -Path $OutputPath -NoTypeInformation -Encoding UTF8

$requiredColumns = @('Title','Handle','Option1 Name','Option1 Value','Variant Price','Variant Grams','Variant Inventory Qty','Variant Inventory Policy','Variant Fulfillment Service','Variant Requires Shipping','Variant Taxable','Variant Weight Unit','Published','Included / [Primary]','Included / International','Status')
$missingColumns = $requiredColumns | Where-Object { $headers -notcontains $_ }
if ($missingColumns) {
    Write-Warning "Missing required columns: $($missingColumns -join ', ')"
}
else {
    Write-Host 'CSV sanity check passed: required columns present.'
}

[pscustomobject]@{
    Products = $productMap.Count
    Variants = $variantCount
    Images   = $totalImages
    Videos   = $totalVideoFiles
    Output   = (Resolve-Path $OutputPath).Path
}
