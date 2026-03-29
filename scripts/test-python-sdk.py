#!/usr/bin/env python3
"""
Python SDK Smoke Test
Validates vienna-sdk package installation and basic functionality
"""

import sys
import os

def test_import():
    """Test SDK can be imported"""
    try:
        import vienna_sdk
        print("✅ vienna_sdk imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import vienna_sdk: {e}")
        return False

def test_governor_init():
    """Test ViennaGovernor initialization"""
    try:
        from vienna_sdk import ViennaGovernor
        
        governor = ViennaGovernor(
            tenant='test-tenant',
            api_key='test-key',
            api_url='http://localhost:3100'
        )
        
        print("✅ ViennaGovernor initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize ViennaGovernor: {e}")
        return False

def test_intent_submission():
    """Test intent submission (simulation mode)"""
    try:
        from vienna_sdk import ViennaGovernor
        
        governor = ViennaGovernor(
            tenant='test-tenant',
            api_key='test-key',
            api_url='http://localhost:3100',
            simulation=True
        )
        
        result = governor.submit_intent({
            'action': 'test_action',
            'parameters': {'param1': 'value1'},
            'risk_tier': 'T0'
        })
        
        assert 'intent_id' in result
        print(f"✅ Intent submitted successfully: {result['intent_id']}")
        return True
    except Exception as e:
        print(f"❌ Failed to submit intent: {e}")
        return False

def test_policy_evaluation():
    """Test policy evaluation"""
    try:
        from vienna_sdk import PolicyEvaluator
        
        evaluator = PolicyEvaluator()
        
        result = evaluator.evaluate({
            'action': 'write_file',
            'parameters': {'path': '/tmp/test.txt'}
        }, policies=[
            {
                'policy_id': 'test-policy',
                'rule': 'action === "write_file"',
                'decision': 'allow'
            }
        ])
        
        assert result['decision'] == 'allow'
        print("✅ Policy evaluation successful")
        return True
    except Exception as e:
        print(f"❌ Failed policy evaluation: {e}")
        return False

def main():
    print("=== Vienna SDK Smoke Test ===\n")
    
    tests = [
        ("Import", test_import),
        ("Governor Initialization", test_governor_init),
        ("Intent Submission", test_intent_submission),
        ("Policy Evaluation", test_policy_evaluation)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\nTest: {name}")
        results.append(test_func())
    
    print("\n=== Summary ===")
    passed = sum(results)
    total = len(results)
    print(f"{passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ All tests passed! SDK is operational.")
        sys.exit(0)
    else:
        print(f"\n❌ {total - passed} tests failed.")
        sys.exit(1)

if __name__ == '__main__':
    main()
