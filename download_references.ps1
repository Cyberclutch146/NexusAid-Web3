$urls = @{
  "Home_Local_Events_Feed.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzU1MTI3ZGFlMDc1YjQ4NDM5ZGVmMTY0MjhjNDgzMDE3EgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
  "Event_Details.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzdkODY3NDNlMWNlNTQ0NTliNmMwNWVlY2M5MjgxYzhhEgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
  "Community_Chat.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzBhN2RjNmU0NjZmOTRkZjk5MDEyNTcwNTIzNmI5ZDVlEgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
  "Create_Event.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzQyMzdmOTE0NWQ5OTQ4ODBiZDg2N2U2N2RhOWMzYzRlEgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
  "User_Profile.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzg5YTE0ZTJlZWVkYzQ4MjU5NjAwZmJmZGFmNDY4MDAxEgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
  "Organizer_Dashboard.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzNjMGEwZTA4MWEzMjQ4MWY4ZDM5MmQ2NDAxYThkMGI3EgsSBxCSu4n1xwsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTM2NzM1MjI4NjU1MTg0Mzc4Mg&filename=&opi=89354086"
}

New-Item -ItemType Directory -Force -Path "stitch_references" | Out-Null

foreach ($file in $urls.Keys) {
    $url = $urls[$file]
    $path = "stitch_references\$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $path
}

Write-Host "Done."
