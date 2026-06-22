// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AgentGlowMac",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "AgentGlowMac", targets: ["AgentGlowMac"])],
    targets: [.executableTarget(name: "AgentGlowMac")]
)
