import SwiftUI

@main
struct AgentGlowMacApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 720, minHeight: 620)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 820, height: 700)
    }
}
