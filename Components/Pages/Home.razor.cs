using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace TPC.Components.Pages;

public partial class Home : ComponentBase, IAsyncDisposable
{
    [Inject]
    private IJSRuntime JS { get; set; } = default!;

    private IJSObjectReference? _module;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            try
            {
                await JS.InvokeVoidAsync("addProject.createMap", "mapDiv");
                await JS.InvokeVoidAsync("addProject.enableCursorCoordinates", "mapCoords");
                await JS.InvokeVoidAsync("addProject.enableAddressSuggest", "parcelAddressInput", "addressSuggestions");
            }
            catch (JSDisconnectedException)
            {
                // Circuit disconnected during render — safe to ignore.
            }
            catch (TaskCanceledException)
            {
                // Component disposed before JS call completed.
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (_module is not null)
            {
                await _module.DisposeAsync();
            }
        }
        catch (JSDisconnectedException)
        {
            // Circuit already disconnected — safe to ignore.
        }
    }
}