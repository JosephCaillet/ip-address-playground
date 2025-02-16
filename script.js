"use strict";

class IpAddress {
	static paddingConf = {
		4: {
			2: 8,
			10: 3,
			16: 2
		},
		6: {
			2: 16,
			10: 5,
			16: 4
		}
	}

	constructor(ip) {
		// Check IP version
		if (ip.includes(".")) {
			// IPv4
			this.version = 4
			if (!/^[0-9.]*$/.test(ip)) {
				throw new Error("Invalid IPv4: contains invalid characters")
			}
		} else if (ip.includes(":")) {
			// IPv6
			this.version = 6
			if (!/^[0-9a-fA-F:]*$/.test(ip)) {
				throw new Error("Invalid IPv6: contains invalid characters")
			}
		} else {
			throw new Error("Invalid IP: nor IPv4 nor IPv6")
		}

		// Check each bytes group
		let bytesGroupsNumber = this.isIpv4() ? 4 : 8
		this.bytesGroups = ip.split(this.getBytesGroupsSeparator())

		// Handle "::" IPv6 notation, and reject it's IPv4 equivalent
		if (this.isIpv4() && ip.includes("..")) {
			throw new Error("Invalid IPv4: \".\" is seen more that once in row")
		}
		if (this.isIpv6()) {
			let doubleColumnCount = (ip.match(/::/g) || []).length
			if (doubleColumnCount > 1) {
				throw new Error("Invalid IPv6: \"::\" can be used only once")
			} else if (doubleColumnCount == 1) {
				if (ip.includes(":::")) {
					throw new Error("Invalid IPv6: \":\" is seen more that twice in row")
				}
				ip = ip.replace("::", ":".repeat(2 + bytesGroupsNumber - this.bytesGroups.length))
				this.bytesGroups = ip.split(this.getBytesGroupsSeparator())
			}
		}

		// Check bytes group number
		if (this.bytesGroups.length != bytesGroupsNumber) {
			throw new Error("Invalid IP: bad bytes groups number")
		}

		// Check each bytes group is a number within allowed range
		for (let i = 0; i < this.bytesGroups.length; i++) {
			// Handle IPv6 "::" notation
			if (this.isIpv6() && this.bytesGroups[i] === "") {
				this.bytesGroups[i] = 0
			}

			// Check is valid number
			let base = this.getDefaultBase()
			let byteGroupValue = parseInt(this.bytesGroups[i], base)
			if (Number.isNaN(byteGroupValue)) {
				throw new Error(`Invalid IP: bytes group number ${i + 1} is not a base ${base} number`)
			}

			// Check is within range
			let max = this.isIpv4() ? 2 ** 8 - 1 : 2 ** 16 - 1
			if (byteGroupValue < 0 || byteGroupValue > max) {
				throw new Error(`Invalid IP: bytes group number ${i + 1} must be a number between 0 and ${max}`)
			}

			this.bytesGroups[i] = byteGroupValue
		}
	}

	isIpv4() {
		return this.version == 4
	}

	isIpv6() {
		return this.version == 6
	}

	getBytesGroupsSeparator() {
		return this.isIpv4() ? "." : ":"
	}

	getDefaultBase() {
		return this.isIpv4() ? 10 : 16
	}

	// TODO: add support for IPv6 compressed notation
	getBytesGroupsString(base = 10, padded = false) {
		let bytesGroupsString = this.bytesGroups.map(bg => Number(bg).toString(base))
		if (padded) {

			bytesGroupsString = bytesGroupsString.map(s => s.padStart(IpAddress.paddingConf[this.version][base], 0))
		}
		return bytesGroupsString
	}

	getIpString(base, padded = false) {
		if (!base) {
			base = this.getDefaultBase()
		}
		return this.getBytesGroupsString(base, padded).join(this.getBytesGroupsSeparator())
	}
}

class IpPanel extends HTMLElement {
	constructor() {
		super()
		this.base = 10
		this.version = 4
	}

	connectedCallback() {
		this.buildHtmlContent()
	}

	// TODO: fix selection (one should be able to select the first displayed line only)
	buildHtmlContent() {
		this.base = this.getAttribute("base")
		this.version = this.getAttribute("version")

		let content = []
		for (let i = 0; i < (this.version == 4 ? 4 : 8); i++) {
			content.push(`
				<span>
					<div class="display">0</div>
					<div><input type="text"></div>
				</span>
			`)
		}

		content = content.join(`
			<span>
				<div>${this.version == 4 ? "." : ":"}</div>
				<div>${this.version == 4 ? "." : ":"}</div>
			</span>
		`)

		this.innerHTML = `<div class="div-cntnr">${content}</div>`
	}

	setIp(ip) {
		if (ip.version != this.version) {
			this.setAttribute("version", ip.version)
			this.buildHtmlContent()
		}

		let bytesGroups = ip.getBytesGroupsString(this.base, this.base != 10)
		let displays = Array.from(this.querySelectorAll(".display"))
		let inputs = Array.from(this.querySelectorAll("input"))

		for (let i = 0; i < bytesGroups.length; i++) {
			displays[i].innerText = bytesGroups[i]
			inputs[i].value = bytesGroups[i]
		}
	}
}

customElements.define("ip-panel", IpPanel)

document.addEventListener("DOMContentLoaded", main)

function main() {
	document.querySelector("#mainIpInput").addEventListener("input", (e) => {
		refreshIp(e.target.value)
	})

	// First refresh init
	refreshIp(document.querySelector("#mainIpInput").value)
}

function refreshIp(ip) {
	let ipAddr
	try {
		ipAddr = new IpAddress(ip)
		document.querySelector("#errorMessage").innerText = ""
	} catch (err) {
		return document.querySelector("#errorMessage").innerText = err.message
	}

	document.querySelector("#mainIpDisplay").innerText = ipAddr.getIpString()
	document.querySelectorAll("ip-panel").forEach(ipp => ipp.setIp(ipAddr))
}